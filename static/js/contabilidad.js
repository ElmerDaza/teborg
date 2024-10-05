document.addEventListener("DOMContentLoaded", function() {
    const tablaContabilidad = document.querySelector("#tabla-contabilidad tbody");
    const btnAgregar = document.querySelector("#agregar-registro");
    const balanceCajaElement = document.createElement("h3");
    document.querySelector("#content").appendChild(balanceCajaElement);
    
    const btnFiltrar = document.querySelector("#btn-filtrar");
    const btnLimpiar = document.querySelector("#btn-limpiar");
    const fechaInicioInput = document.querySelector("#fecha-inicio");
    const fechaFinInput = document.querySelector("#fecha-fin");

    // Función para cargar los registros existentes con filtros opcionales
    function cargarRegistros(fechaInicio = null, fechaFin = null) {

        // Configuración para convertir a la hora local de Colombia (UTC-5)
        const opciones = {
            timeZone: 'America/Bogota', // Zona horaria de Colombia (UTC-5)
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false  // Formato de 24 horas
        };

        // Construir la URL con parámetros si se proporcionan fechas
        let url = '/obtener_registros';
        const params = [];
        if (fechaInicio) {
            params.push(`fecha_inicio=${encodeURIComponent(fechaInicio)}`);
        }
        if (fechaFin) {
            params.push(`fecha_fin=${encodeURIComponent(fechaFin)}`);
        }
        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                // Limpiar la tabla antes de llenarla
                tablaContabilidad.innerHTML = "";

                // Recorrer los registros y agregarlos a la tabla
                data.registros.forEach(registro => {
                    // Crear una fecha en formato ISO 8601 (UTC)
                    const fechaUTC = new Date(registro.fecha);
                    const fechaColombia = fechaUTC.toLocaleString('es-CO', opciones);

                    const nuevaFila = document.createElement("tr");
                    nuevaFila.innerHTML = `
                        <td>${fechaColombia}</td>
                        <td>${registro.descripcion}</td>
                        <td>${registro.monto.toLocaleString('es-CO')}</td>
                        <td>${registro.tipo}</td>
                        <td><button class="eliminar-registro" data-id="${registro._id}">Eliminar</button></td>
                    `;
                    if (registro.tipo ==="egreso"){
                        nuevaFila.style.background = '#ff3939';
                    }
                    
                    tablaContabilidad.appendChild(nuevaFila);

                    // Añadir evento para eliminar el registro
                    nuevaFila.querySelector(".eliminar-registro").addEventListener("click", function() {
                        eliminarRegistro(registro._id, nuevaFila);
                    });
                });

                // Mostrar el balance de la caja
                balanceCajaElement.textContent = `Monto en caja: $${data.balance_caja.toLocaleString('es-ES')}`;
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
        const fecha = Date.now(); // Fecha y hora actual completa timestamp
        const monto = prompt("Ingresa el monto:");
        const descripcion = prompt("Ingresa una descripción:");
        const tipo = prompt("¿Es un ingreso o egreso? (ingreso/egreso):").toLowerCase();

        if (tipo !== "ingreso" && tipo !== "egreso") {
            alert("Tipo no válido. Debe ser 'ingreso' o 'egreso'.");
            return;
        }

        // Validar que se haya ingresado un monto válido
        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            alert("Monto no válido. Debe ser un número positivo.");
            return;
        }

        // Enviar datos al servidor para almacenarlos en MongoDB
        fetch('/agregar_registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 'fecha':fecha, descripcion, monto: montoNum, tipo })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.mensaje);
            cargarRegistros(); // Recargar los registros después de agregar uno nuevo
        })
        .catch(error => console.error('Error:', error));
    });

    // Evento para filtrar registros por fecha
    btnFiltrar.addEventListener("click", function() {
        const fechaInicio = fechaInicioInput.value; // Formato: YYYY-MM-DD
        const fechaFin = fechaFinInput.value;       // Formato: YYYY-MM-DD

        if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
            alert("La fecha de inicio no puede ser mayor que la fecha de fin.");
            return;
        }

        cargarRegistros(fechaInicio, fechaFin);
    });

    // Evento para limpiar el filtro de fecha
    btnLimpiar.addEventListener("click", function() {
        fechaInicioInput.value = '';
        fechaFinInput.value = '';
        cargarRegistros(); // Cargar todos los registros
    });

});
