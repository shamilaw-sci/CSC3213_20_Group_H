

export default function AvailabilityPage() {
  return (
    <div>
      <h1>Professional Availability</h1>
      <AvailabilityForm />
    </div>
  );
}

function AvailabilityForm() {
  return (
    <form>
      {/* Placeholder form to satisfy missing component error */}
      <label>
        Available:
        <input type="checkbox" name="available" />
      </label>
    </form>
  );
}