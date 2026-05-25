import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

export default function DataCards({ userItem }) {
  const [active, setActive] = useState(false);
  const cardRef = useRef(null);

  const handleClick = () => setActive(!active);

  // Close overlay if click happens outside this card
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setActive(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={cardRef}
      className="relative bg-gray-800/70 backdrop-blur-md text-yellow-300 rounded-xl shadow-lg p-6 cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-2xl"
      onClick={handleClick}
    >
      {/* Card content */}
      <div className={`${active ? "blur-sm" : ""} transition-all duration-300`}>
        <h3 className="text-xl font-semibold text-white">{userItem.name} {userItem.lastname}</h3>
        <p className="text-gray-300">{userItem.email}</p>
        <p className="text-gray-400">Role: <span className="capitalize">{userItem.role}</span></p>
        <p className="text-gray-400">
          Status: 
          <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
            userItem.isAdminVerified ? "bg-yellow-500/30 text-yellow-300" : "bg-gray-600/30 text-gray-300"
          }`}>
            {userItem.isAdminVerified ? "Validated" : "Pending"}
          </span>
        </p>
      </div>

      {/* Action overlay */}
      {active && (
        <div className="absolute inset-0 flex flex-col justify-center items-center gap-4 bg-black/50 rounded-xl transition-opacity">
          <Link to={`/dash/adminUser/${userItem._id || userItem.id }`} className="w-36">
            <button className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-lg shadow-black/30">
              View
            </button>
          </Link>
          <Link to={`/dash/delete/${userItem._id || userItem.id}`} className="w-36">
            <button className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-black/30">
              Delete
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
