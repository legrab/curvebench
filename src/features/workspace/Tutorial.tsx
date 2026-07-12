export function Tutorial({ onClose }: { onClose(): void }) {
  return (
    <section className="tutorial" aria-labelledby="tutorial-heading">
      <div>
        <h2 id="tutorial-heading">Getting started: decay is not linear</h2>
        <ol>
          <li>Inspect the normalized radioactive-decay measurements.</li>
          <li>Add a linear regression and open residuals.</li>
          <li>Compare its systematic residual pattern with the exponential fit.</li>
          <li>Change the exponential rate, then restore the fitted values.</li>
        </ol>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={onClose}
        aria-label="Dismiss getting-started exercise"
      >
        ×
      </button>
    </section>
  );
}
