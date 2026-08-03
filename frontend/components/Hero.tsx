import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const Hero = () => {
  return (
    <div
      className={`${nunito.className} flex justify-center items-center h-[calc(100vh-80px)]`}
    >
      <div className="flex flex-col items-center">
        <div className="text-7xl md:text-9xl font-semibold">CareBridge</div>
        <p className="text-xl mt-4">Because every student deserves to be heard</p>
      </div>
      
    </div>
  );
};

export default Hero;
