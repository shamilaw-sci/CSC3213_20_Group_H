import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const Hero = () => {
  return (
    <div
      className={`${nunito.className} flex flex-col justify-center items-center relative h-[calc(100vh-80px)]`}
    >
      <div className="flex flex-col items-center">
        <div className="text-7xl md:text-9xl font-extrabold">CareBridge</div>
        <p className="text-xl mt-4">
          Because every student deserves to be heard
        </p>
      </div>
      {/* Add a mute button to mute the audio */}
      {/* How are you feeling today? */}
      <p className="absolute bottom-12 left-1/2 -translate-x-1/2 text-lg">
        How are you feeling today?
      </p>
      {/* Scroll down button to show more features */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        ↓
      </div>
    </div>
  );
};

export default Hero;
