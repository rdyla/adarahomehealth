import { useMemo, useState } from "react";
                ))}
              </ul>
            ) : (
              <p className="muted">No images selected yet.</p>
            )}
          </div>
        </section>
      </main>

      <section className="panel results-panel">
        <div className="results-header">
          <div>
            <h2>Results</h2>
            <p className="muted">Per-user response details from the Worker and Zoom API.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={downloadResults}
            disabled={!result}
          >
            Download JSON
          </button>
        </div>

        {!result ? (
          <div className="empty-state">No upload has been run yet.</div>
        ) : (
          <>
            <div className="meta-grid summary-grid">
              <div className="stat-card success">
                <span className="stat-label">Succeeded</span>
                <strong>{result.succeeded}</strong>
              </div>
              <div className="stat-card failure">
                <span className="stat-label">Failed</span>
                <strong>{result.failed}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total</span>
                <strong>{result.total}</strong>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Email</th>
                    <th>Filename</th>
                    <th>HTTP</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row, index) => (
                    <tr key={`${row.email}-${row.filename}-${index}`}>
                      <td>
                        <span className={row.success ? "pill success" : "pill failure"}>
                          {row.success ? "Success" : "Failed"}
                        </span>
                      </td>
                      <td>{row.email || "—"}</td>
                      <td>{row.filename || "—"}</td>
                      <td>{row.status || "—"}</td>
                      <td className="message-cell">{row.message || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
