// Pasos para conseguir cada enlace. Se enseñan en la bienvenida y en Ajustes.

export function MoodleHowTo() {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-muted marker:text-muted">
      <li>Entra en el Moodle de tu universidad (el campus virtual) desde el ordenador.</li>
      <li>Abre el <strong className="font-medium text-fg">Calendario</strong> (suele estar en el menú o en el bloque «Calendario»).</li>
      <li>Pulsa <strong className="font-medium text-fg">Importar o exportar calendarios</strong> y luego <strong className="font-medium text-fg">Exportar calendario</strong>.</li>
      <li>Elige <strong className="font-medium text-fg">Todos los cursos</strong> y <strong className="font-medium text-fg">Eventos recientes y próximos</strong>.</li>
      <li>Pulsa <strong className="font-medium text-fg">Obtener URL del calendario</strong>, copia el enlace que aparece y pégalo aquí.</li>
    </ol>
  );
}

export function OutlookHowTo() {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-muted marker:text-muted">
      <li>Abre <a href="https://outlook.office.com/calendar" target="_blank" rel="noreferrer" className="underline underline-offset-2">Outlook en la web</a> e inicia sesión.</li>
      <li>Pulsa la rueda de <strong className="font-medium text-fg">Configuración</strong> → <strong className="font-medium text-fg">Calendario</strong> → <strong className="font-medium text-fg">Calendarios compartidos</strong>.</li>
      <li>En <strong className="font-medium text-fg">Publicar un calendario</strong>, elige tu calendario y <strong className="font-medium text-fg">Puede ver todos los detalles</strong>, y pulsa <strong className="font-medium text-fg">Publicar</strong>.</li>
      <li>Copia el enlace <strong className="font-medium text-fg">ICS</strong> (el que acaba en <code>.ics</code>) y pégalo aquí.</li>
    </ol>
  );
}
