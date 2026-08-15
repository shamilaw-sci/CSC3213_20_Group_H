import React from "react";

const Info = () => {
  return (
    <div>
      <section
        id="info"
        className="min-h-screen flex flex-col justify-center px-6 py-20"
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl font-extrabold mb-6">You're Not Alone</h2>

          <p className="text-xl text-gray-600 leading-8 max-w-3xl mx-auto">
            University life can be exciting, but it can also be overwhelming.
            Academic pressure, deadlines, relationships, and personal challenges
            affect every student differently. CareBridge is here to provide a
            safe, supportive space where you can express how you're feeling and
            find the help you need.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="rounded-2xl border p-8 shadow-sm hover:shadow-lg transition">
              <h3 className="text-2xl font-bold mb-4">🌱 Check In</h3>
              <p className="text-gray-600">
                Share how you're feeling today through a quick, simple emotional
                check-in.
              </p>
            </div>

            <div className="rounded-2xl border p-8 shadow-sm hover:shadow-lg transition">
              <h3 className="text-2xl font-bold mb-4">Find Support</h3>
              <p className="text-gray-600">
                Access helpful resources and connect with university counselling
                services whenever you need them.
              </p>
            </div>

            <div className="rounded-2xl border p-8 shadow-sm hover:shadow-lg transition">
              <h3 className="text-2xl font-bold mb-4">
                📈 Track Your Well-being
              </h3>
              <p className="text-gray-600">
                Monitor your emotional well-being over time and recognize
                patterns that can help you take better care of yourself.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Info;
