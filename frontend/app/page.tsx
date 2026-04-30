import Link from "next/link";

export default function Home() {
    return (
        <div style={{ padding: "50px" }}>
            <h1>Welcome</h1>

            <Link href="/login">
                Login
            </Link>
        </div>
    );
}