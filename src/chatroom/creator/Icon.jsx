const icons = import.meta.glob("./icons/*.svg", { eager: true, query: "?url", import: "default" });

export default function Icon({ name, className = "" }) {
  return <img className={`creator-icon ${className}`} src={icons[`./icons/${name}.svg`]} alt="" aria-hidden="true" draggable="false" />;
}
