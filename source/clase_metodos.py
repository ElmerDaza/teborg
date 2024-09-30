from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from datetime import datetime, timedelta
import pytz

# Calcular la posición X para centrar el texto en la página
def x(ancho, ancho_texto):
    return (ancho - ancho_texto) / 2

# Función para generar el PDF de factura electrónica en Colombia
def generar_factura_pdf(factura):
    # Crear el PDF
    pdf_nombre = f"factura_electronica_{str(factura['_id'])}.pdf"
    c = canvas.Canvas(pdf_nombre, pagesize=(8 * cm, 20 * cm))  # Ticket 8 cm de ancho y 20 cm de largo
    
    # Establecer coordenadas de inicio
    ancho, alto = 8 * cm, 20 * cm

    # Información de la empresa emisora
    c.setFont("Helvetica-Bold", 8)
    texto = "TEBORG"
    ancho_texto = c.stringWidth(texto, "Helvetica-Bold", 8)
    c.drawString(x(ancho, ancho_texto), alto - 1 * cm, texto)
    
    c.setFont("Helvetica", 8)
    texto = "NIT: 123456789-0"
    ancho_texto = c.stringWidth(texto, "Helvetica", 8)
    c.drawString(x(ancho, ancho_texto), alto - 1.5 * cm, texto)
    
    texto = "Dirección: Calle 123 #45-67, Riohacha-La Guajira"
    ancho_texto = c.stringWidth(texto, "Helvetica", 8)
    c.drawString(x(ancho, ancho_texto), alto - 2 * cm, texto)

    texto = "Teléfono: +57 301 5820726"
    ancho_texto = c.stringWidth(texto, "Helvetica", 8)
    c.drawString(x(ancho, ancho_texto), alto - 2.5 * cm, texto)

    texto = "Correo: info@teborg.com"
    ancho_texto = c.stringWidth(texto, "Helvetica", 8)
    c.drawString(x(ancho, ancho_texto), alto - 3 * cm, texto)

    # Número de factura y fecha
    c.setFont("Helvetica-Bold", 8)
    texto = f"Factura No: {str(factura['_id'])}"
    ancho_texto = c.stringWidth(texto, "Helvetica-Bold", 8)
    c.drawString(x(ancho, ancho_texto), alto - 4 * cm, texto)
    
    texto = f"Fecha de Emisión: {tranform_fecha(factura['fecha'])}"
    ancho_texto = c.stringWidth(texto, "Helvetica-Bold", 8)
    c.drawString(x(ancho, ancho_texto), alto - 4.5 * cm, texto)

    # Información del cliente
    c.setFont("Helvetica", 8)
    texto = f"Cliente: {factura['cliente']}"
    ancho_texto = c.stringWidth(texto, "Helvetica", 8)
    c.drawString(x(ancho, ancho_texto), alto - 5.5 * cm, texto)

    texto = f"NIT/Cédula: {factura['Id Cliente']}"
    ancho_texto = c.stringWidth(texto, "Helvetica", 8)
    c.drawString(x(ancho, ancho_texto), alto - 6 * cm, texto)

    # Detalles de la resolución de facturación DIAN
    texto = "Autorizado mediante resolución DIAN No. 12345 de 2024"
    ancho_texto = c.stringWidth(texto, "Helvetica", 8)
    c.drawString(x(ancho, ancho_texto), alto - 7 * cm, texto)

    texto = "Rango autorizado: 00001 a 10000"
    ancho_texto = c.stringWidth(texto, "Helvetica", 8)
    c.drawString(x(ancho, ancho_texto), alto - 7.5 * cm, texto)

    # Detalles de los productos
    c.setFont("Helvetica-Bold", 8)
    c.drawString(1 * cm, alto - 8.5 * cm, "Productos:")
    
    y = alto - 9 * cm
    total_sin_impuestos = 0

    for producto in factura['productos']:
        c.setFont("Helvetica", 8)
        c.drawString(1 * cm, y, f"{producto['nombre']} (x{producto['cantidad']}) - ${producto['precio_unitario']:.2f} c/u")
        y -= 0.5 * cm
        total_sin_impuestos += producto['precio_unitario'] * producto['cantidad']

    # Cálculos de impuestos (IVA al 19%)
    iva = total_sin_impuestos * 0.19
    total_con_impuestos = total_sin_impuestos + iva
    
    # Mostrar valores de la factura
    c.setFont("Helvetica-Bold", 8)
    c.drawString(1 * cm, y, f"Subtotal: ${total_sin_impuestos:.2f}")
    y -= 0.5 * cm
    c.drawString(1 * cm, y, f"IVA (19%): ${iva:.2f}")
    y -= 0.5 * cm
    c.drawString(1 * cm, y, f"Total a Pagar: ${total_con_impuestos:.2f}")
    y -= 1 * cm

    # Código CUFE (simulado en este ejemplo)
    c.setFont("Helvetica-Bold", 8)
    texto = "Código CUFE: ABCD1234EFGH5678IJKL9101112MNOP"
    ancho_texto = c.stringWidth(texto, "Helvetica-Bold", 8)
    c.drawString(x(ancho, ancho_texto), y, texto)
    y -= 1 * cm

    # Firma digital
    c.setFont("Helvetica", 8)
    texto = "Firma Electrónica: Teborg"
    ancho_texto = c.stringWidth(texto, "Helvetica", 8)
    c.drawString(x(ancho, ancho_texto), y, texto)

    # Finalizar el PDF
    c.showPage()
    c.save()


def tranform_fecha(fecha_iso):

    # Convertir la cadena ISO a un objeto datetime
    fecha_utc = datetime.strptime(fecha_iso, "%Y-%m-%dT%H:%M:%S.%fZ")

    # Definir la zona horaria UTC
    zona_utc = pytz.utc

    # Asignar la zona horaria UTC a la fecha
    fecha_utc = zona_utc.localize(fecha_utc)

    # Definir la zona horaria de Colombia
    zona_colombia = pytz.timezone("America/Bogota")

    # Convertir la fecha a la zona horaria de Colombia
    fecha_colombia = fecha_utc.astimezone(zona_colombia)

    #fecha y hora en Colombia
    return (fecha_colombia.strftime("%Y-%m-%d %H:%M:%S"))

def generar_fechas_intermedias(fecha_inicio, fecha_fin):
    # Convertir las cadenas de fechas en objetos datetime
    inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d')
    fin = datetime.strptime(fecha_fin, '%Y-%m-%d')

    # Lista para almacenar las fechas intermedias
    fechas_intermedias = []

    # Generar las fechas intermedias
    delta = timedelta(days=1)
    while inicio <= fin:
        fechas_intermedias.append(inicio.strftime('%Y-%m-%d'))
        inicio += delta

    return fechas_intermedias

