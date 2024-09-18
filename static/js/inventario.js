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
                        <td>${producto.reservado}</td>
                        <td>${parseInt(producto.cantidad) - parseInt(producto.reservado)}</td>
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


/*
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
            body: JSON.stringify({ nombre, cantidad, precio_unitario})
        })
        .then(response => response.json())
        .then(data => {
            alert(data.mensaje);
            cargarInventario(); // Recargar el inventario después de agregar un producto
        })
        .catch(error => console.error('Error:', error));
    });*/
    document.getElementById('producto-form').addEventListener('submit', function(event) {
        event.preventDefault();  // Evitar que se recargue la página
    
        // Obtener los valores del formulario
        const nombre = document.getElementById('nombre').value;
        const cantidad = document.getElementById('cantidad').value;
        const precio_unitario = document.getElementById('precio_unitario').value;
    
        // Crear el objeto con los datos
        const data = {
            nombre: nombre,
            cantidad: parseInt(cantidad),
            precio_unitario: parseInt(precio_unitario)
        };
    
        // Enviar los datos al servidor
        fetch('/agregar_producto', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            alert('Producto registrado con éxito');
            //cargar inventario al registrar producto
            cargarInventario();
            // Limpiar el formulario
            document.getElementById('producto-form').reset();
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Hubo un error al registrar el producto.');
        });
        
    });
});



