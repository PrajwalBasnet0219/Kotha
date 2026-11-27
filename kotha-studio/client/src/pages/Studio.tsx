import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useDb, mutate, withActivity, uid, roleLabel, formatDate, formatNpr, resetDb } from '../lib/store';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { MiniPlan } from '../components/landing/MiniPlan';

export function Studio() {
  const { user, signOut } = useAuth();
  const db = useDb();

  const [tab, setTab] = useState<'plans' | 'catalogue' | 'account'>('plans');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<string | null>(null);

  const projects = useMemo(() => {
    if (!user) return [];
    if (user.role === 'client') return db.projects.filter((project) => project.ownerId === user.id);
    return db.projects;
  }, [db.projects, user]);

  const selectedProject = projects.find((project) => project.id === selected) ?? null;

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.products.filter((product) => {
      if (product.state !== 'published') return false;
      if (category !== 'All' && product.category !== category) return false;
      if (q && !product.name.toLowerCase().includes(q) && !product.material.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [db.products, category, query]);

  const createPlan = () => {
    if (!user) return;
    const count = projects.length + 1;
    const project = {
      id: uid('prj'),
      name: `Untitled plan ${String(count).padStart(2, '0')}`,
      owner: user.name,
      ownerId: user.id,
      status: 'draft' as const,
      rooms: 1,
      area: 0,
      updatedAt: new Date().toISOString(),
    };
    mutate((current) => withActivity({ ...current, projects: [project, ...current.projects] }, user.name, `opened “${project.name}”`));
    setSelected(project.id);
  };

  const renameProject = (id: string, name: string) => {
    mutate((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === id ? { ...project, name, updatedAt: new Date().toISOString() } : project,
      ),
    }));
  };

  const setProjectStatus = (id: string, status: 'draft' | 'in-review' | 'ready') => {
    mutate((current) =>
      withActivity(
        {
          ...current,
          projects: current.projects.map((project) =>
            project.id === id ? { ...project, status, updatedAt: new Date().toISOString() } : project,
          ),
        },
        user?.name ?? 'Someone',
        `marked a plan ${status === 'in-review' ? 'in review' : status}`,
      ),
    );
  };

  const deleteProject = (id: string) => {
    mutate((current) => withActivity({ ...current, projects: current.projects.filter((p) => p.id !== id) }, user?.name ?? 'Someone', 'removed a plan'));
    if (selected === id) setSelected(null);
  };

  if (!user) return null;

  return (
    <div className="shell">
      <aside className="shell__side">
        <Link to="/" className="brand shell__brand">
          <svg className="brand__mark" viewBox="0 0 24 24">
            <path d="M12 12C9.4 8.8 7.5 7.6 5.7 8.4c-1.9 1-1.9 3.1 0 4.1 1.8.9 3.7-.3 6.3-3.4 2.6-3.1 4.5-4.3 6.3-3.4 1.9 1 1.9 3.1 0 4.1-1.8.9-3.7-.3-6.3-3.4Z" />
          </svg>
          <span className="brand__word">Kotha Studio</span>
        </Link>

        <nav className="shell__nav" aria-label="Workspace">
          {(['plans', 'catalogue', 'account'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`shell__nav-btn ${tab === item ? 'is-active' : ''}`}
              onClick={() => setTab(item)}
            >
              <span className="mono">{String(['01', '02', '03'][['plans', 'catalogue', 'account'].indexOf(item)])}</span>
              {item === 'plans' ? 'Plans' : item === 'catalogue' ? 'Catalogue' : 'Account'}
            </button>
          ))}
        </nav>

        <div className="shell__side-foot">
          <ThemeToggle />
          <Link to="/" className="shell__side-link mono">
            ← Back to the sheet
          </Link>
          {user.role === 'admin' ? (
            <Link to="/admin" className="shell__side-link mono">
              Admin dashboard →
            </Link>
          ) : null}
          <button type="button" className="shell__side-link mono" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="shell__main">
        <header className="shell__head">
          <div>
            <p className="mono shell__kicker">Workspace · {roleLabel(user.role)}</p>
            <h1 className="shell__title">
              {tab === 'plans' ? 'Plans on the board.' : tab === 'catalogue' ? 'The catalogue.' : 'Account.'}
            </h1>
          </div>
          <div className="shell__user">
            <span className="shell__avatar" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="shell__user-name">{user.name}</p>
              <p className="mono">{user.email}</p>
            </div>
          </div>
        </header>

        {tab === 'plans' ? (
          <div className="studio-grid">
            <div className="studio-plans">
              <div className="studio-plans__head">
                <p className="mono">
                  {projects.length.toString().padStart(2, '0')} plan{projects.length === 1 ? '' : 's'}
                </p>
                <button type="button" className="btn btn--solid btn--sm" onClick={createPlan}>
                  New plan
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="empty">
                  <p className="empty__title">No plans yet.</p>
                  <p className="empty__lede">
                    Open a blank sheet and calibrate it against a photograph or a drawing.
                  </p>
                  <button type="button" className="btn" onClick={createPlan}>
                    Open a plan
                  </button>
                </div>
              ) : (
                <div className="plan-grid">
                  {projects.map((project) => (
                    <article
                      key={project.id}
                      className={`plan-card ${selected === project.id ? 'is-selected' : ''}`}
                      onClick={() => setSelected(project.id)}
                    >
                      <div className="plan-card__thumb">
                        <MiniPlan />
                        <span className={`plan-card__status plan-card__status--${project.status}`}>
                          {project.status === 'in-review' ? 'In review' : project.status === 'ready' ? 'Ready' : 'Draft'}
                        </span>
                      </div>
                      <div className="plan-card__body">
                        <h3>{project.name}</h3>
                        <p className="mono">
                          {project.rooms} room{project.rooms === 1 ? '' : 's'} · {project.area ? `${project.area.toFixed(1)} m²` : 'uncalibrated'}
                        </p>
                        <p className="mono plan-card__date">Edited {formatDate(project.updatedAt)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <aside className="studio-detail">
              {selectedProject ? (
                <div className="detail">
                  <p className="mono detail__kicker">Selected plan</p>
                  <input
                    className="detail__name"
                    value={selectedProject.name}
                    onChange={(event) => renameProject(selectedProject.id, event.target.value)}
                  />
                  <p className="mono detail__meta">
                    Owner · {selectedProject.owner} · {formatDate(selectedProject.updatedAt)}
                  </p>

                  <div className="detail__stats">
                    <div>
                      <p className="detail__num">{selectedProject.rooms}</p>
                      <p className="mono">Rooms</p>
                    </div>
                    <div>
                      <p className="detail__num">{selectedProject.area ? selectedProject.area.toFixed(1) : '—'}</p>
                      <p className="mono">Area m²</p>
                    </div>
                  </div>

                  <div className="detail__status">
                    <p className="mono detail__label">Status</p>
                    <div className="detail__chips">
                      {(['draft', 'in-review', 'ready'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`chip ${selectedProject.status === status ? 'is-active' : ''}`}
                          onClick={() => setProjectStatus(selectedProject.id, status)}
                        >
                          {status === 'in-review' ? 'In review' : status === 'ready' ? 'Ready' : 'Draft'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="detail__actions">
                    <Link
                      className="btn btn--solid btn--sm"
                      to={`/blueprint/${selectedProject.id}`}
                    >
                      Open blueprint
                    </Link>
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => deleteProject(selectedProject.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty empty--detail">
                  <p className="mono">Select a plan to edit its details.</p>
                </div>
              )}
            </aside>
          </div>
        ) : null}

        {tab === 'catalogue' ? (
          <div className="catalogue">
            <div className="catalogue__toolbar">
              <label className="field field--inline">
                <span className="mono">Search</span>
                <input
                  type="search"
                  value={query}
                  placeholder="Sofa, ash, lighting…"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="field field--inline">
                <span className="mono">Category</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="All">All</option>
                  {db.categories.map((entry) => (
                    <option key={entry.id} value={entry.name}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="catalogue-grid">
              {visibleProducts.map((product) => (
                <article key={product.id} className="cat-card">
                  <div className="cat-card__top">
                    <span className="mono cat-card__cat">{product.category}</span>
                    <span className="mono cat-card__fit">
                      {product.w} × {product.d} × {product.h} mm
                    </span>
                  </div>
                  <h3>{product.name}</h3>
                  <p className="cat-card__mat">{product.material}</p>
                  <p className="mono cat-card__meta">
                    Budget guide · NPR {formatNpr(product.price)}
                  </p>
                </article>
              ))}
            </div>
            {visibleProducts.length === 0 ? (
              <p className="mono empty-inline">No pieces match that filter.</p>
            ) : null}
          </div>
        ) : null}

        {tab === 'account' ? (
          <div className="account-panel">
            <div className="account-card">
              <p className="mono account-card__kicker">Signed in</p>
              <p className="account-card__name">{user.name}</p>
              <p className="mono">{user.email} · {roleLabel(user.role)}</p>
              <p className="mono">Joined {formatDate(user.createdAt)}</p>
              <div className="account-card__actions">
                <ThemeToggle showLabel />
                <button type="button" className="btn" onClick={signOut}>
                  Sign out
                </button>
              </div>
            </div>

            <div className="account-card">
              <p className="mono account-card__kicker">Demo data</p>
              <p className="account-card__lede">
                The studio runs on a local store while the API is being built. Resetting restores
                the seeded catalogue, projects and accounts.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (window.confirm('Reset all local studio data?')) resetDb();
                }}
              >
                Reset local data
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
