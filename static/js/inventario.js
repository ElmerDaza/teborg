document.addEventListener("DOMContentLoaded", function() {
    const tablaInventario = document.querySelector("#tabla-inventario tbody");
    const btnAgregar = document.querySelector("#agregar-producto");

    // Función para cargar el inventario desde el servidor
    function cargarInventario() {
        fetch('/obtener_inventario')
            .then(response => response.json())
            .then(data => {
                // Limpiar la tabla antes de llenarla
                tablaInventario.innerHTML = "";

                // Recorrer los productos y agregarlos a la tabla
                data.productos.forEach(producto => {
                    const nuevaFila = document.createElement("tr");
                    nuevaFila.innerHTML = `
                        <td>${producto.nombre}</td>
                        <td>${producto.cantidad}</td>
                        <td>${producto.precio_unitario}</td>
                        <td><button class="eliminar-producto" data-id="${producto._id}">Eliminar</button></td>
                    `;
                    tablaInventario.appendChild(nuevaFila);

                    // Añadir evento para eliminar el producto
                    nuevaFila.querySelector(".eliminar-producto").addEventListener("click", function() {
                        eliminarProducto(producto._id, nuevaFila);
                    });
                });
            })
            .catch(error => console.error('Error:', error));
    }

    // Función para eliminar un producto del inventario
    function eliminarProducto(id, fila) {
        if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
            fetch(`/eliminar_producto/${id}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    alert(data.mensaje);
                    tablaInventario.removeChild(fila); // Eliminar la fila visualmente
                    cargarInventario(); // Recargar el inventario después de eliminar
                })
                .catch(error => console.error('Error:', error));
        }
    }

    // Cargar inventario al iniciar la página
    cargarInventario();

    // Evento para agregar un nuevo producto
    btnAgregar.addEventListener("click", function() {
        const nombre = prompt("Ingresa el nombre del producto:");
        const cantidad = prompt("Ingresa la cantidad disponible:");
        const precio_unitario = prompt("Ingresa el precio unitario:");

        // Validación básica
        if (!nombre || isNaN(cantidad) || isNaN(precio_unitario)) {
            alert("Datos no válidos.");
            return;
        }

        // Enviar datos al servidor para almacenarlos en MongoDB
        fetch('/agregar_producto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, cantidad, precio_unitario })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.mensaje);
            cargarInventario(); // Recargar el inventario después de agregar un producto
        })
        .catch(error => console.error('Error:', error));
    });
});
