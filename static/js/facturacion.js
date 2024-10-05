document.addEventListener("DOMContentLoaded", function() {
    const productosContainer = document.querySelector("#productos-container");
    const formFactura = document.querySelector("#form-factura");
    const totalDisplay = document.querySelector("#total");
    let totalFactura = 0;
    let productosSeleccionados = [];

    // Cargar productos disponibles desde el servidor
    function cargarProductos() {
        fetch('/obtener_inventario_disponible')
            .then(response => response.json())
            .then(data => {
                productosContainer.innerHTML = "";
                data.productos.forEach(producto => {
                    if (producto.cantidad > producto.reservado) {
                        const item = document.createElement("div");
                        item.classList.add("producto-item");
                        item.innerHTML = `
                            <input type="checkbox" id="producto-${producto._id}" value="${producto.nombre}">
                            <label for="producto-${producto._id}">${producto.nombre} (Disponible: ${producto.cantidad - producto.reservado}, Precio: $${producto.precio_unitario})</label>
                            <input type="number" min="1" max="${producto.cantidad - producto.reservado}" placeholder="Cantidad">
                        `;
                        productosContainer.appendChild(item);
                    }
                });
            })
            .catch(error => console.error("Error cargando productos:", error));
    }

    // Función para calcular el total de la factura
    function calcularTotal() {
        totalFactura = productosSeleccionados.reduce((sum, producto) => sum + producto.cantidad * producto.precio_unitario, 0);
        totalDisplay.textContent = totalFactura.toFixed(2);
    }

    // Evento para agregar productos a la factura
    document.querySelector("#agregar-producto").addEventListener("click", function() {
        const checkboxes = productosContainer.querySelectorAll("input[type='checkbox']");
        productosSeleccionados = [];

        checkboxes.forEach((checkbox, index) => {
            if (checkbox.checked) {
                const nombre = checkbox.value;
                const cantidadInput = productosContainer.querySelectorAll("input[type='number']")[index];
                const cantidad = parseInt(cantidadInput.value);
                const precioUnitario = parseFloat(checkbox.parentElement.querySelector("label").textContent.split("Precio: $")[1]);

                if (cantidad > 0) {
                    productosSeleccionados.push({ nombre, cantidad, precio_unitario: precioUnitario });
                }
            }
        });

        calcularTotal();
    });

    // Evento para crear una factura
    formFactura.addEventListener("submit", function(event) {
        event.preventDefault();
        const cliente = document.querySelector("#cliente").value;
        const Idcliente = document.querySelector("#Idcliente").value;

        if (productosSeleccionados.length === 0) {
            alert("Debe seleccionar al menos un producto.");
            return;
        }

        // Enviar datos al servidor para crear la factura
        const fechaActual = Date.now(); // Fecha y hora actual completa timestamp

        fetch('/crear_factura', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente,Idcliente, productos: productosSeleccionados, total: totalFactura, fecha: fechaActual })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.mensaje);
            cargarFacturasPendientes();  // Recargar las facturas pendientes
            cargarProductos()//actualizar la cantidad de productos
            formFactura.reset();
            productosSeleccionados = [];
            totalFactura = 0;
            totalDisplay.textContent = "0.00";
        })
        .catch(error => console.error("Error creando factura:", error));
    });

    // Cargar facturas pendientes
    function cargarFacturasPendientes() {
        fetch('/obtener_facturas_pendientes')
            .then(response => response.json())
            .then(data => {
                const tablaFacturas = document.querySelector("#tabla-facturas tbody");
                tablaFacturas.innerHTML = "";

                data.facturas.forEach(factura => {
                    const fila = document.createElement("tr");
                    fila.innerHTML = `
                        <td>${factura._id}</td>
                        <td>${factura.cliente}</td>
                        <td>$${factura.total}</td>
                        <td>${factura.estado}</td>
                        <td>
                            <button class="confirmar-pago" data-id="${factura._id}">Confirmar Pago</button>
                            <button class="cancelar-factura" data-id="${factura._id}">Cancelar</button>
                        </td>
                    `;
                    tablaFacturas.appendChild(fila);

                    // Evento para confirmar pago
                    fila.querySelector(".confirmar-pago").addEventListener("click", function() {
                        confirmarPago(factura._id);
                    });

                    // Evento para cancelar factura
                    fila.querySelector(".cancelar-factura").addEventListener("click", function() {
                        cancelarFactura(factura._id);
                    });
                });
            })
            .catch(error => console.error("Error cargando facturas pendientes:", error));
    }

    // Función para confirmar el pago de una factura
    function confirmarPago(id) {
        fetch(`/confirmar_pago/${id}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                alert(data.mensaje);
                cargarFacturasPendientes();
            })
            .catch(error => console.error("Error confirmando pago:", error));
    }

    // Función para cancelar una factura
    function cancelarFactura(id) {
        if (confirm("¿Estás seguro de que deseas cancelar esta factura?")) {
            fetch(`/cancelar_factura/${id}`, { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    alert(data.mensaje);
                    cargarFacturasPendientes();
                })
                .catch(error => console.error("Error cancelando factura:", error));
        }
    }

    // Inicialización: cargar productos y facturas pendientes
    cargarProductos();
    cargarFacturasPendientes();
});
