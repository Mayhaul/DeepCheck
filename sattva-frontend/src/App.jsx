import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, FileText, Globe2, Play, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { demoCases } from './data/demoData';
import { getReport, getInvestigationStatus, startAnalysis, submitInvestigation } from './services/api';
import GradientWaves from './components/GradientWaves';
import SpecularButton from './components/SpecularButton';

const types = [
  ['text', 'Claim only', FileText],
  ['document', 'Claim + document', FileText],
];

const stages = [
  ['submission_received', 'Submission received'],
  ['claim_analysis', 'Claim analysis'],
  ['document_rag', 'Document RAG'],
  ['web_search', 'Web search'],
  ['source_credibility', 'Source credibility'],
  ['knowledge_base', 'Curated knowledge base'],
  ['evidence_synthesis', 'Evidence comparison'],
  ['report_generation', 'Report generation'],
];

const names = {
  SUPPORTED: 'Supported',
  LIKELY_FALSE: 'Likely false',
  MIXED: 'Mixed evidence',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
};

const Pill = ({ children }) => <span className="pill amber">{children}</span>;

function Header() {
  return (
    <header>
      <Link className="brand" to="/">
        <img className="brand-logo" src="/fivicon.jpg" alt="" />
        DeepCheck
      </Link>
      <nav>
        <Link to="/investigate">Investigate</Link>
        <Link to="/demo">Demo</Link>
        <small>HYBRID EVIDENCE AI</small>
      </nav>
    </header>
  );
}

function Landing() {
  const navigate = useNavigate();

  return (
    <main>
      <section className="hero">
        <Pill>HYBRID EVIDENCE INVESTIGATION</Pill>
        <h1>
          Don’t ask if it’s fake.
          <br />
          <em>Ask what the evidence says.</em>
        </h1>
        <p>
          Compare user-provided evidence with live web evidence and investigate the credibility
          history of the source behind a claim.
        </p>
        <div className="actions">
          <SpecularButton className="primary" onClick={() => navigate('/investigate')} autoAnimate>
            Investigate a claim <ArrowRight size={16} />
          </SpecularButton>
          <SpecularButton className="secondary" onClick={() => navigate('/demo')} autoAnimate>
            <Play size={14} /> Demo
          </SpecularButton>
        </div>
      </section>

      <div className="flow">
        DOCUMENT RAG <ArrowRight /> WEB SEARCH <ArrowRight /> SOURCE CREDIBILITY <ArrowRight />{' '}
        <b>REPORT</b>
      </div>

      <section className="features">
        {[
          [FileText, 'Document RAG', 'Retrieve relevant passages from the evidence you provide.'],
          [Globe2, 'Independent web search', 'Check the same claim against current web evidence.'],
          [ShieldCheck, 'Source credibility', 'Search the public history of the person or organization behind the claim.'],
        ].map(([I, t, d]) => (
          <article key={t}>
            <I />
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function Investigate() {
  const nav = useNavigate();
  const [type, setType] = useState('document');
  const [claim, setClaim] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function go(e) {
    e.preventDefault();
    if (!claim.trim()) return setError('Enter the claim or fact you want to verify.');
    if (type === 'document' && !file) return setError('Attach the evidence document to continue.');

    setSubmitting(true);
    setError('');

    const data = new FormData();
    data.append('type', type);
    data.append('claim', claim.trim());
    if (sourceName.trim()) data.append('sourceName', sourceName.trim());
    if (file) data.append('file', file);

    try {
      const result = await submitInvestigation(data);
      await startAnalysis(result.submissionId);
      nav(`/investigation/${result.submissionId}`);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not start the investigation. Check the backend and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page narrow">
      <Pill>NEW INVESTIGATION</Pill>
      <h2>Bring both sides of the evidence.</h2>
      <p>
        Enter the claim and optionally attach the document supporting it. DeepCheck independently
        searches the web and checks the source history.
      </p>
      <form onSubmit={go}>
        <div className="types">
          {types.map(([id, n, I]) => (
            <button
              key={id}
              type="button"
              className={type === id ? 'chosen' : ''}
              onClick={() => {
                setType(id);
                setError('');
                if (id === 'text') setFile(null);
              }}
            >
              <I size={17} />
              {n}
            </button>
          ))}
        </div>

        <label className="input">
          <small>CLAIM / FACT TO VERIFY</small>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Example: The Ministry announced..."
          />
        </label>

        {type === 'document' && (
          <label className="drop">
            <input
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Upload />
            <b>{file?.name || 'Drop evidence here'}</b>
            <span>PDF or text document</span>
          </label>
        )}

        <label className="input">
          <small>SOURCE / PUBLISHER (OPTIONAL)</small>
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Person, organization, publisher, or website"
          />
        </label>

        {error && <p className="err">{error}</p>}

        <button disabled={submitting} className="button primary wide">
          {submitting ? 'Starting investigation…' : 'Start investigation'} <ArrowRight size={16} />
        </button>
      </form>
    </main>
  );
}

function Investigation() {
  const { id } = useParams();
  const [state, setState] = useState({
    status: 'processing',
    stage: 'submission_received',
    progress: 0,
    message: 'Connecting…',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const next = await getInvestigationStatus(id);
        if (cancelled) return;
        setState(next);
        if (next.status === 'failed') {
          setError(next.message || 'Investigation failed.');
          return;
        }
        if (next.status === 'completed') return;
        if (++attempts > 400) {
          setError('Investigation timed out.');
          return;
        }
        setTimeout(poll, 1500);
      } catch {
        if (!cancelled) setError('Could not retrieve investigation status.');
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const active = stages.findIndex(([key]) => key === state.stage);

  return (
    <main className="page narrow">
      <Pill>{state.status === 'completed' ? 'ANALYSIS COMPLETE' : 'INVESTIGATION IN PROGRESS'}</Pill>
      <h2>{state.status === 'completed' ? 'Evidence has been synthesized.' : 'Following the evidence trail.'}</h2>
      <p>
        {state.progress || 0}% · {state.message}
      </p>
      <div className="progress">
        {stages.map(([key, label], i) => (
          <div key={key} className={i === active ? 'active' : ''}>
            <i>{i < active ? <Check size={13} /> : <Sparkles size={13} />}</i>
            <b>
              {label}
              <small>{i < active ? 'Completed' : i === active ? state.message : 'Pending'}</small>
            </b>
          </div>
        ))}
      </div>
      {error ? (
        <p className="err">{error}</p>
      ) : state.status === 'completed' ? (
        <Link className="button primary" to={`/report/${id}`}>
          Open report <ArrowRight size={16} />
        </Link>
      ) : (
        <p className="note">This page polls the backend until the report is ready.</p>
      )}
    </main>
  );
}

function Report() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const demo = demoCases.find((x) => x.id === id);
    if (demo) {
      setReport(demo);
      return;
    }
    getReport(id).then(setReport).catch(() => setError('Report is not ready yet.'));
  }, [id]);

  if (error) return <main className="page narrow"><Pill>REPORT</Pill><h2>{error}</h2><Link className="button" to="/investigate">Start another investigation</Link></main>;
  if (!report) return <main className="page narrow"><Pill>REPORT</Pill><h2>Loading report…</h2></main>;

  return (
    <main className="report">
      <Pill>{report.isDemo ? 'DEMO REPORT' : 'INVESTIGATION REPORT'}</Pill>
      <h2>{names[report.verdict] || report.verdict}</h2>
      <section className="scores">
        <article>
          <small>OVERALL CREDIBILITY</small>
          <div className="score">
            {report.credibilityScore ?? report.trustScore ?? '—'}<i>/ 100</i>
          </div>
          <Pill>{report.confidenceLevel} CONFIDENCE</Pill>
          <p>{report.summary}</p>
        </article>
        <article>
          <h3>Score breakdown</h3>
          {Object.entries(report.scores || {}).map(([k, v]) => (
            <p className="meta" key={k}>
              <span>{k}</span><b>{v ?? '—'}</b>
            </p>
          ))}
        </article>
      </section>

      <section className="cols">
        <div>
          <article>
            <h3>Reasoning</h3>
            {(report.reasoning || []).map((x) => <p key={x}>{x}</p>)}
          </article>
          <article>
            <h3>Evidence comparison</h3>
            {(report.evidenceTrail || []).map((e, i) => (
              <div className="evidence" key={i}>
                <b>{e.type || 'Evidence'}</b>
                <p>{e.description || e.title || JSON.stringify(e)}</p>
              </div>
            ))}
          </article>
        </div>

        <aside>
          <article>
            <h3>Uploaded document</h3>
            <p>
              {report.uploadedDocument?.available
                ? `${report.uploadedDocument.retrievedChunks?.length || 0} relevant passages retrieved.`
                : 'No document evidence supplied.'}
            </p>
            {report.uploadedDocument?.retrievedChunks?.map((c, i) => <p className="note" key={i}>{c.text}</p>)}
          </article>
          <article>
            <h3>Web evidence</h3>
            {(report.webEvidence?.results || report.sources || []).map((r) => (
              <a className="source" href={r.url} target="_blank" rel="noreferrer" key={r.url}>
                <span><b>{r.publisher}</b>{r.title}<small>{r.description || r.date || ''}</small></span>
                <ArrowRight size={14} />
              </a>
            ))}
          </article>
          <article>
            <h3>Source credibility</h3>
            <p className="score">{report.sourceProfile?.score ?? '—'}<i>/ 100</i></p>
            <p>{report.sourceProfile?.explanation || 'Source history was not available.'}</p>
            <p className="note">Historical source signals do not prove the current claim false.</p>
          </article>
        </aside>
      </section>
    </main>
  );
}

function Demo() {
  return (
    <main className="page">
      <Pill>DEMO</Pill>
      <h2>Sample investigations</h2>
      <div className="demos">
        {demoCases.map((r) => (
          <Link to={`/report/${r.id}`} key={r.id}>
            <Pill>{r.verdict}</Pill>
            <h3>{r.label}</h3>
            <p>{r.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <GradientWaves className="app-background" />
        <div className="app-content">
          <Header />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/investigate" element={<Investigate />} />
            <Route path="/investigation/:id" element={<Investigation />} />
            <Route path="/report/:id" element={<Report />} />
            <Route path="/demo" element={<Demo />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
