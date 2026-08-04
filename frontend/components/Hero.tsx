import { Nunito } from "next/font/google";
import { ChevronDown } from "lucide-react";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const Hero = () => {
  return (
    <section
      className={`${nunito.className} flex flex-col justify-center items-center relative h-[calc(100vh-80px)]`}
    >
      <div className="flex flex-col items-center">
        <div className="text-7xl md:text-9xl font-extrabold">CareBridge</div>
        <p className="text-xl mt-4">
          Because every student deserves to be heard
        </p>
      </div>
      <div
        onClick={() =>
          document.getElementById("info")?.scrollIntoView({
            behavior: "smooth",
          })
        }
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex cursor-pointer flex-col items-center"
      >
        <p className="mb-2 text-lg font-semibold">How are you feeling today?</p>

        <ChevronDown size={40} className="animate-bounce text-gray-700" />
      </div>
    </section>
  );
};

export default Hero;
