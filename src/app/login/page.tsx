"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 font-[Bebas_Neue] text-3xl text-[#124B23]">Login Admin / Vendor</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[#124B23] px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}
