document.addEventListener("DOMContentLoaded", function() {
    const tablaContabilidad = document.querySelector("#tabla-contabilidad tbody");
    const btnAgregar = document.querySelector("#agregar-registro");
    const balanceCajaElement = document.createElement("h3");
    document.querySelector("#content").appendChild(balanceCajaElement);

    // Función para cargar los registros existentes
    function cargarRegistros() {
        fetch('/obtener_registros')
            .then(response => response.json())
            .then(data => {
                // Limpiar la tabla antes de llenarla
                tablaContabilidad.innerHTML = "";

                // Recorrer los registros y agregarlos a la tabla
                data.registros.forEach(registro => {
                    const nuevaFila = document.createElement("tr");
                    nuevaFila.innerHTML = `
                        <td>${registro.fecha}</td>
                        <td>${registro.descripcion}</td>
                        <td>${registro.monto}</td>
                        <td>${registro.tipo}</td>
                        <td><button class="eliminar-registro" data-id="${registro._id}">Eliminar</button></td>
                    `;
                    tablaContabilidad.appendChild(nuevaFila);

                    // Añadir evento para eliminar el registro
                    nuevaFila.querySelector(".eliminar-registro").addEventListener("click", function() {
                        eliminarRegistro(registro._id, nuevaFila);
                    });
                });

                // Mostrar el balance de la caja
                balanceCajaElement.textContent = `Monto en caja: $${data.balance_caja.toFixed(2)}`;
            })
            .catch(error => console.error('Error:', error));
    }

    // Función para eliminar un registro
    function eliminarRegistro(id, fila) {
        if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
            fetch(`/eliminar_registro/${id}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    alert(data.mensaje);
                    tablaContabilidad.removeChild(fila); // Eliminar la fila de la tabla visualmente
                    cargarRegistros(); // Recargar los registros para actualizar el balance
                })
                .catch(error => console.error('Error:', error));
        }
    }

    // Cargar los registros cuando la página cargue
    cargarRegistros();

    // Evento para agregar un nuevo registro
    btnAgregar.addEventListener("click", function() {
        const fecha = prompt("Ingresa la fecha (DD/MM/AAAA):");
        const descripcion = prompt("Ingresa una descripción:");
        const monto = prompt("Ingresa el monto:");
        const tipo = prompt("¿Es un ingreso o egreso? (ingreso/egreso):").toLowerCase();

        if (tipo !== "ingreso" && tipo !== "egreso") {
            alert("Tipo no válido. Debe ser 'ingreso' o 'egreso'.");
            return;
        }

        // Enviar datos al servidor para almacenarlos en MongoDB
        fetch('/agregar_registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, descripcion, monto, tipo })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.mensaje);
            cargarRegistros(); // Recargar los registros después de agregar uno nuevo
        })
        .catch(error => console.error('Error:', error));
    });
});
