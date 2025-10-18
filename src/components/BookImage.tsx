import { useState } from "react";

interface BookImageProps {
  src: string;
  alt: string;
}

export function BookImage({ src, alt }: BookImageProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation based on mouse position
    // Negative values for opposite direction rotation
    const rotateYValue = -(((x - centerX) / centerX) * 10);
    const rotateXValue = ((y - centerY) / centerY) * 10;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      className="mb-8 flex justify-center perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative w-1/2 sm:w-1/2 md:w-2/5 lg:w-1/3 max-w-sm transition-transform duration-300 ease-out cursor-pointer"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-auto object-cover rounded-lg shadow-2xl"
          style={{
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          }}
        />
      </div>
    </div>
  );
}
