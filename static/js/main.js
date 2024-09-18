// Archivo: main.js

// Evento para mostrar un mensaje al hacer clic en un enlace de la barra de navegación
document.addEventListener("DOMContentLoaded", function() {
    const navLinks = document.querySelectorAll("nav ul li a");
    
    navLinks.forEach(link => {
        link.addEventListener("click", function(event) {
            event.preventDefault();
            const section = event.target.textContent;
            // Puedes redirigir a las secciones como normalmente se hace:
            window.location.href = this.href;
        });
    });
});
