"use client";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main className="page narrow">
      <h1>Your workspace could not open.</h1>
      <p>
        Check that browser storage is enabled and there is free space on this
        device. Your previously saved notes have not been intentionally removed.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <p>
        <a href="/privacy">About local storage</a>
      </p>
    </main>
  );
}
