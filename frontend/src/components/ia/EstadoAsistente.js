/** Textos de cada estado del asistente. Se usan para etiquetas accesibles y para el texto visible. */
export const ESTADOS_ASISTENTE = {
  inactivo: { corto: 'Listo', largo: 'Habla con el asistente', accion: 'Hablar' },
  conectando: { corto: 'Conectando', largo: 'Conectando con el asistente...', accion: 'Cancelar' },
  escuchando: { corto: 'Te escucho', largo: 'Te escucho. Cuéntame qué se te antoja.', accion: 'Dejar de hablar' },
  hablando: { corto: 'Respondiendo', largo: 'El asistente está respondiendo.', accion: 'Detener' },
  error: { corto: 'Sin conexión', largo: 'No pudimos conectar con el asistente.', accion: 'Reintentar' },
};
