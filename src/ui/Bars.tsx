interface BarraProps {
  etiqueta: string;
  valor: number;
  /** Color de la barra llena. */
  color: string;
  /** Si es true, 100 es malo (hambre) y se invierte la lectura. */
  invertida?: boolean;
}

/** Barra de estado 0-100 con su etiqueta. Se usa para hambre, ánimo y vínculo. */
export function Barra({ etiqueta, valor, color, invertida = false }: BarraProps) {
  const pct = Math.round(Math.min(100, Math.max(0, valor)));
  const lectura = invertida ? 100 - pct : pct;

  return (
    <div className="barra">
      <div className="barra-cabecera">
        <span>{etiqueta}</span>
        <span className="barra-valor">{lectura}%</span>
      </div>
      <div className="barra-pista">
        <div className="barra-relleno" style={{ width: `${lectura}%`, background: color }} />
      </div>
    </div>
  );
}
