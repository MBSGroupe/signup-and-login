import { Link } from "react-router-dom";

export default function NavLink({ text, path }) {
  // Anchor scroll (same page sections)
  if (path?.startsWith("#")) {
    return (
      <a href={path} className="px-3 py-2 text-[#94A3B8] hover:text-[#22C55E] transition-colors font-medium">
        {text}
      </a>
    );
  }

  // React Router navigation
  return (
    <Link to={path || "/"} className="px-3 py-2 text-[#94A3B8] hover:text-[#22C55E] transition-colors font-medium">
      {text}
    </Link>
  );
}