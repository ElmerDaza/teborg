from flask import Flask, render_template, request, redirect, url_for, jsonify
from pymongo import MongoClient
from bson import ObjectId
from source import clase_metodos as cm
from datetime import datetime
import pytz, re

app = Flask(__name__)

# Configuración de la conexión a MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['uniform_factory_db']  # Nombre de la base de datos

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/contabilidad')
def contabilidad():
    return render_template('contabilidad.html')

# Ruta para agregar un registro contable
@app.route('/agregar_registro', methods=['POST'])
def agregar_registro():
    data = request.json
    tipo = data.get('tipo', 'ingreso')  # Si no especifica el tipo, por defecto es ingreso

    # Crear un documento con los datos recibidos
    # Convertir la cadena de fecha a objeto datetime
    fecha_iso = data["fecha"]  # Espera una cadena en formato ISO 8601
    fecha_datetime = datetime.fromisoformat(fecha_iso.replace("Z", "+00:00"))  # Convertir a datetime con zona UTC

    nuevo_registro = {
        "fecha": fecha_datetime,
        "descripcion": data["descripcion"],
        "monto": float(data["monto"]),
        "tipo": tipo
    }

    # Insertar en la base de datos
    result = db.registros_contables.insert_one(nuevo_registro)

    return jsonify({"mensaje": "Registro agregado correctamente", "id": str(result.inserted_id)}), 201

@app.route('/obtener_registros', methods=['GET'])
def obtener_registros():
    # Obtener los parámetros de fecha si existen
    fecha_inicio_str = request.args.get('fecha_inicio')
    fecha_fin_str = request.args.get('fecha_fin')
    filtro={}
    if fecha_inicio_str:
        fechas_intermedias = cm.generar_fechas_intermedias(fecha_inicio_str,fecha_fin_str)
        
    
        filtro = [{
            "$match": {
                "$or": [
                    {"fecha": {"$regex": f"^{re.escape(fecha)}", "$options": "i"}}
                    for fecha in fechas_intermedias
                ]
            }
        }]
        # Ejecutar el pipeline
        registros = list(db.registros_contables.aggregate(filtro))
        # Obtener los registros filtrados, ordenados por fecha descendente
    else:
        registros = list(db.registros_contables.find(filtro).sort("fecha", -1).limit(30))
    for registro in registros:
        registro["_id"] = str(registro["_id"])  # Convertir ObjectId a string para enviarlo como JSON
        # Convertir fecha a ISO string
        registro["fecha"] = registro["fecha"]

    # Calcular el balance de la caja usando el filtro
    # Definir el pipeline de agregación
    filtro={}
    pipeline = [
        {
            "$match": filtro if filtro else {}
        },
        {
            "$group": {
                "_id": None,  # Agrupa todos los documentos en un solo grupo
                "total_ingresos": {
                    "$sum": {
                        "$cond": [
                            { "$eq": ["$tipo", "ingreso"] },  # Condición: tipo == "ingreso"
                            "$monto",  # Si es ingreso, sumar el monto
                            0          # Si no, sumar 0
                        ]
                    }
                },
                "total_egresos": {
                    "$sum": {
                        "$cond": [
                            { "$eq": ["$tipo", "egreso"] },   # Condición: tipo == "egreso"
                            "$monto",  # Si es egreso, sumar el monto
                            0          # Si no, sumar 0
                        ]
                    }
                }
            }
        },
        {
            "$project": {
                "_id": 0,  # No mostrar el campo _id
                "total_ingresos": 1,
                "total_egresos": 1,
                "valor_en_caja": { "$subtract": ["$total_ingresos", "$total_egresos"] }
            }
        }
    ]

    # Ejecutar el pipeline de agregación
    resultados = db.registros_contables.aggregate(pipeline)

    balance_caja = 0
    for resultado in resultados:
        balance_caja = resultado.get("valor_en_caja", 0)

    return jsonify({"registros": registros, "balance_caja": balance_caja})

@app.route('/eliminar_registro/<id>', methods=['DELETE'])
def eliminar_registro(id):
    resultado = db.registros_contables.delete_one({"_id": ObjectId(id)})
    if resultado.deleted_count == 1:
        return jsonify({"mensaje": "Registro eliminado correctamente"}), 200
    else:
        return jsonify({"mensaje": "Registro no encontrado"}), 404

@app.route('/inventario')
def inventario():
    return render_template('inventario.html')

# Ruta para obtener los productos del inventario
@app.route('/obtener_inventario', methods=['GET'])
def obtener_inventario():
    productos = list(db.inventario.find({}))
    for producto in productos:
        producto["_id"] = str(producto["_id"])  # Convertir ObjectId a string para enviarlo como JSON
    return jsonify({"productos": productos})

# Ruta para agregar un producto al inventario
@app.route('/agregar_producto', methods=['POST'])
def agregar_producto():
    data = request.json
    nuevo_producto = {
        "nombre": data["nombre"],
        "cantidad": int(data["cantidad"]),
        "precio_unitario": float(data["precio_unitario"]),
        "reservado": 0
    }
    db.inventario.insert_one(nuevo_producto)
    return jsonify({"mensaje": "Producto agregado correctamente"})

# Ruta para eliminar un producto del inventario
@app.route('/eliminar_producto/<id>', methods=['DELETE'])
def eliminar_producto(id):
    resultado = db.inventario.delete_one({"_id": ObjectId(id)})
    if resultado.deleted_count == 1:
        return jsonify({"mensaje": "Producto eliminado correctamente"}), 200
    else:
        return jsonify({"mensaje": "Producto no encontrado"}), 404

@app.route('/modificar_producto/<producto_id>', methods=['PUT'])
def modificar_producto(producto_id):
    try:
        # Obtener datos enviados desde el formulario
        datos = request.get_json()

        # Asegurarse de que los campos requeridos estén presentes
        if 'nombre' not in datos or 'cantidad' not in datos or 'precio_unitario' not in datos:
            return jsonify({"error": "Faltan campos obligatorios"}), 400

        # Actualizar el producto en la base de datos
        resultado = db.inventario.update_one(
            {"_id": ObjectId(producto_id)},
            {"$set": {
                "nombre": datos['nombre'],
                "cantidad": datos['cantidad'],
                "precio_unitario": datos['precio_unitario'],
                "reservado": datos.get('reservado', 0)
            }}
        )

        if resultado.matched_count == 1:
            return jsonify({"mensaje": "Producto actualizado correctamente"}), 200
        else:
            return jsonify({"error": "Producto no encontrado"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/facturacion')
def facturacion():
    return render_template('facturacion.html')

@app.route('/crear_factura', methods=['POST'])
def crear_factura():
    data = request.json
    productos_facturados = data["productos"]  # Lista de productos y cantidades facturadas
    cliente = data["cliente"]
    total = data["total"]
    fecha = data["fecha"]

    # Verificar si hay suficiente stock antes de reservar los productos
    for producto in productos_facturados:
        producto_db = db.inventario.find_one({"nombre": producto["nombre"]})
        if producto_db:
            cantidad_disponible = producto_db["cantidad"] - producto_db["reservado"]
            if cantidad_disponible < producto["cantidad"]:
                return jsonify({"mensaje": f"No hay suficiente stock para {producto['nombre']}"})

    # Reservar los productos
    for producto in productos_facturados:
        db.inventario.update_one(
            {"nombre": producto["nombre"]},
            {"$inc": {"reservado": producto["cantidad"]}}
        )

    
    nueva_factura = {
        "cliente": cliente,
        "Id Cliente": data.get("Idcliente", ""),
        "productos": productos_facturados,
        "total": int(total),
        "fecha": fecha,
        "estado": "pendiente"  # Factura creada, pero pendiente de pago
    }
    result = db.facturas.insert_one(nueva_factura)

    return jsonify({"mensaje": "Factura creada y productos reservados correctamente", "id": str(result.inserted_id)}), 200

@app.route('/confirmar_pago/<factura_id>', methods=['POST'])
def confirmar_pago(factura_id):
    factura = db.facturas.find_one({"_id": ObjectId(factura_id)})
    if factura and factura["estado"] == "pendiente":
        # Generar factura.pdf
        cm.generar_factura_pdf(factura)
        productos_facturados = factura["productos"]
        list_product = ""
        # Reducir la cantidad del inventario y liberar las reservas
        for producto in productos_facturados:
            db.inventario.update_one(
                {"nombre": producto["nombre"]},
                {"$inc": {"cantidad": -producto["cantidad"], "reservado": -producto["cantidad"]}}
            )
            list_product += producto["nombre"] + ", "

        # Actualizar el estado de la factura a "pagada"
        db.facturas.update_one(
            {"_id": ObjectId(factura_id)},
            {"$set": {"estado": "pagada"}}
        )

        # Crear un documento con los datos recibidos
        nuevo_registro = {
            "fecha": factura["fecha"],
            "descripcion": f"venta de: {list_product}",
            "monto": float(factura["total"]),
            "tipo": "ingreso"
        }
        # Insertar en la base de datos
        db.registros_contables.insert_one(nuevo_registro)

        return jsonify({"mensaje": "Pago confirmado y productos descontados del inventario"}), 200
    else:
        return jsonify({"mensaje": "Factura no encontrada o ya pagada"}), 404

# Cancelar la factura pendiente
@app.route('/cancelar_factura/<factura_id>', methods=['POST'])
def cancelar_factura(factura_id):
    factura = db.facturas.find_one({"_id": ObjectId(factura_id)})

    if factura and factura["estado"] == "pendiente":
        productos_facturados = factura["productos"]

        # Liberar las reservas de los productos
        for producto in productos_facturados:
            db.inventario.update_one(
                {"nombre": producto["nombre"]},
                {"$inc": {"reservado": -producto["cantidad"]}}
            )

        # Eliminar la factura
        db.facturas.delete_one({"_id": ObjectId(factura_id)})

        return jsonify({"mensaje": "Factura cancelada y productos liberados"}), 200
    else:
        return jsonify({"mensaje": "Factura no encontrada o ya pagada"}), 404

# Ruta para obtener las facturas pendientes
@app.route('/obtener_facturas_pendientes', methods=['GET'])
def obtener_facturas_pendientes():
    facturas = list(db.facturas.find({"estado": "pendiente"}))
    for factura in facturas:
        factura["_id"] = str(factura["_id"])
    return jsonify({"facturas": facturas})

@app.route('/obtener_inventario_disponible', methods=['GET'])
def obtener_inventario_disponible():
    productos = list(db.inventario.find({}))
    for producto in productos:
        producto["_id"] = str(producto["_id"])
    return jsonify({"productos": productos})

@app.route('/usuarios')
def usuarios():
    return render_template('usuarios.html')

if __name__ == '__main__':
    app.run(debug=True)
