import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  useDb,
  mutate,
  withActivity,
  uid,
  roleLabel,
  initials,
  formatDate,
  formatNpr,
  newProduct,
} from '../lib/store';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { ProductDialog } from '../components/admin/ProductDialog';

type Tab = 'overview' | 'products' | 'categories' | 'projects' | 'people';

export function Admin() {
  const { user, signOut } = useAuth();
  const db = useDb();

  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [productOpen, setProductOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof db.products)[number] | null>(null);
  const [newCategory, setNewCategory] = useState('');

  if (!user || user.role !== 'admin') return null;

  const actor = user.name;

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.products.filter((product) => {
      if (categoryFilter !== 'All' && product.category !== categoryFilter) return false;
      if (q && !product.name.toLowerCase().includes(q) && !product.material.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [db.products, categoryFilter, query]);

  const stats = useMemo(() => {
    const published = db.products.filter((p) => p.state === 'published').length;
    const drafts = db.products.filter((p) => p.state === 'draft').length;
    const archived = db.products.filter((p) => p.state === 'archived').length;
    return {
      users: db.users.length,
      products: db.products.length,
      published,
      drafts,
      archived,
      projects: db.projects.length,
      comments: 0,
    };
  }, [db]);

  const saveProduct = (input: Parameters<typeof newProduct>[0]) => {
    if (editing) {
      mutate((current) =>
        withActivity(
          {
            ...current,
            products: current.products.map((product) =>
              product.id === editing.id
                ? { ...product, ...input, updatedAt: new Date().toISOString() }
                : product,
            ),
          },
          actor,
          `revised “${input.name}”`,
        ),
      );
    } else {
      mutate((current) =>
        withActivity(
          { ...current, products: [newProduct(input), ...current.products] },
          actor,
          `added “${input.name}” to ${input.category}`,
        ),
      );
    }
    setEditing(null);
  };

  const archiveProduct = (id: string, nextState: 'published' | 'archived') => {
    const product = db.products.find((entry) => entry.id === id);
    if (!product) return;
    mutate((current) =>
      withActivity(
        {
          ...current,
          products: current.products.map((entry) =>
            entry.id === id ? { ...entry, state: nextState, updatedAt: new Date().toISOString() } : entry,
          ),
        },
        actor,
        `${nextState === 'archived' ? 'archived' : 'restored'} “${product.name}”`,
      ),
    );
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    if (db.categories.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) return;
    mutate((current) =>
      withActivity({ ...current, categories: [...current.categories, { id: uid('cat'), name }] }, actor, `added category “${name}”`),
    );
    setNewCategory('');
  };

  const removeCategory = (id: string) => {
    const category = db.categories.find((entry) => entry.id === id);
    if (!category) return;
    if (db.products.some((product) => product.category === category.name)) return;
    mutate((current) =>
      withActivity({ ...current, categories: current.categories.filter((entry) => entry.id !== id) }, actor, `removed category “${category.name}”`),
    );
  };

  const setProjectStatus = (id: string, status: 'draft' | 'in-review' | 'ready') => {
    const project = db.projects.find((entry) => entry.id === id);
    if (!project) return;
    mutate((current) =>
      withActivity(
        {
          ...current,
          projects: current.projects.map((entry) =>
            entry.id === id ? { ...entry, status, updatedAt: new Date().toISOString() } : entry,
          ),
        },
        actor,
        `moved “${project.name}” to ${status}`,
      ),
    );
  };

  const removeProject = (id: string) => {
    const project = db.projects.find((entry) => entry.id === id);
    if (!project) return;
    if (!window.confirm(`Remove “${project.name}”?`)) return;
    mutate((current) =>
      withActivity({ ...current, projects: current.projects.filter((entry) => entry.id !== id) }, actor, `removed “${project.name}”`),
    );
  };

  const setUserRole = (id: string, role: 'client' | 'designer' | 'admin') => {
    const person = db.users.find((entry) => entry.id === id);
    if (!person || person.id === user.id) return;
    mutate((current) =>
      withActivity(
        {
          ...current,
          users: current.users.map((entry) => (entry.id === id ? { ...entry, role } : entry)),
        },
        actor,
        `changed ${person.name}’s role to ${role}`,
      ),
    );
  };

  const removeUser = (id: string) => {
    const person = db.users.find((entry) => entry.id === id);
    if (!person || person.id === user.id) return;
    if (!window.confirm(`Remove ${person.name}?`)) return;
    mutate((current) =>
      withActivity({ ...current, users: current.users.filter((entry) => entry.id !== id) }, actor, `removed ${person.name}`),
    );
  };

  return (
    <div className="shell">
      <aside className="shell__side">
        <Link to="/" className="brand shell__brand">
          <svg className="brand__mark" viewBox="0 0 24 24">
            <path d="M12 12C9.4 8.8 7.5 7.6 5.7 8.4c-1.9 1-1.9 3.1 0 4.1 1.8.9 3.7-.3 6.3-3.4 2.6-3.1 4.5-4.3 6.3-3.4 1.9 1 1.9 3.1 0 4.1-1.8.9-3.7-.3-6.3-3.4Z" />
          </svg>
          <span className="brand__word">Kotha Studio</span>
        </Link>

        <nav className="shell__nav" aria-label="Admin">
          {(['overview', 'products', 'categories', 'projects', 'people'] as Tab[]).map((item, index) => (
            <button
              key={item}
              type="button"
              className={`shell__nav-btn ${tab === item ? 'is-active' : ''}`}
              onClick={() => setTab(item)}
            >
              <span className="mono">{String(index + 1).padStart(2, '0')}</span>
              {item === 'overview'
                ? 'Overview'
                : item === 'products'
                  ? 'Products'
                  : item === 'categories'
                    ? 'Categories'
                    : item === 'projects'
                      ? 'Projects'
                      : 'People'}
            </button>
          ))}
        </nav>

        <div className="shell__side-foot">
          <ThemeToggle />
          <Link to="/studio" className="shell__side-link mono">
            ← Workspace
          </Link>
          <Link to="/" className="shell__side-link mono">
            Back to the sheet
          </Link>
          <button type="button" className="shell__side-link mono" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="shell__main">
        <header className="shell__head">
          <div>
            <p className="mono shell__kicker">Admin · {actor}</p>
            <h1 className="shell__title">
              {tab === 'overview'
                ? 'Platform at a glance.'
                : tab === 'products'
                  ? 'The catalogue.'
                  : tab === 'categories'
                    ? 'Categories.'
                    : tab === 'projects'
                      ? 'Projects in the studio.'
                      : 'People and roles.'}
            </h1>
          </div>
          <div className="shell__user">
            <span className="shell__avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <div>
              <p className="shell__user-name">{user.name}</p>
              <p className="mono">{roleLabel(user.role)}</p>
            </div>
          </div>
        </header>

        {tab === 'overview' ? (
          <div className="admin-overview">
            <div className="stat-grid">
              <div className="stat">
                <p className="stat__num">{stats.users}</p>
                <p className="mono">Accounts</p>
              </div>
              <div className="stat">
                <p className="stat__num">{stats.products}</p>
                <p className="mono">Products</p>
              </div>
              <div className="stat">
                <p className="stat__num">{stats.published}</p>
                <p className="mono">Published</p>
              </div>
              <div className="stat">
                <p className="stat__num">{stats.drafts}</p>
                <p className="mono">Drafts</p>
              </div>
              <div className="stat">
                <p className="stat__num">{stats.archived}</p>
                <p className="mono">Archived</p>
              </div>
              <div className="stat">
                <p className="stat__num">{stats.projects}</p>
                <p className="mono">Projects</p>
              </div>
            </div>

            <div className="admin-two">
              <section className="admin-panel">
                <p className="mono admin-panel__title">Recent activity</p>
                {db.activity.length === 0 ? (
                  <p className="mono empty-inline">Nothing recorded yet.</p>
                ) : (
                  <ul className="activity-list">
                    {db.activity.slice(0, 12).map((entry) => (
                      <li key={entry.id}>
                        <p className="activity-list__action">{entry.action}</p>
                        <p className="mono">
                          {entry.actor} · {formatDate(entry.at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="admin-panel">
                <p className="mono admin-panel__title">Catalogue health</p>
                <ul className="health-list">
                  <li>
                    <span>Published pieces</span>
                    <span className="mono">{stats.published}</span>
                  </li>
                  <li>
                    <span>Drafts awaiting review</span>
                    <span className="mono">{stats.drafts}</span>
                  </li>
                  <li>
                    <span>Archived pieces</span>
                    <span className="mono">{stats.archived}</span>
                  </li>
                  <li>
                    <span>Categories in use</span>
                    <span className="mono">
                      {new Set(db.products.map((p) => p.category)).size} / {db.categories.length}
                    </span>
                  </li>
                </ul>
                <p className="mono admin-panel__note">
                  Pieces are reference objects for the room. Nothing is sold from the platform.
                </p>
              </section>
            </div>
          </div>
        ) : null}

        {tab === 'products' ? (
          <div className="admin-products">
            <div className="admin-toolbar">
              <label className="field field--inline">
                <span className="mono">Search</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, material…" />
              </label>
              <label className="field field--inline">
                <span className="mono">Category</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="All">All</option>
                  {db.categories.map((entry) => (
                    <option key={entry.id} value={entry.name}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn--solid btn--sm"
                onClick={() => {
                  setEditing(null);
                  setProductOpen(true);
                }}
              >
                Add product
              </button>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Dimensions (mm)</th>
                    <th>Material</th>
                    <th>Budget</th>
                    <th>State</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <span className="admin-table__name">{product.name}</span>
                        <span className="mono admin-table__sub">{formatDate(product.updatedAt)}</span>
                      </td>
                      <td>{product.category}</td>
                      <td className="mono">
                        {product.w} × {product.d} × {product.h}
                      </td>
                      <td>{product.material}</td>
                      <td className="mono">NPR {formatNpr(product.price)}</td>
                      <td>
                        <span className={`pill pill--${product.state}`}>{product.state}</span>
                      </td>
                      <td className="admin-table__actions">
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            setEditing(product);
                            setProductOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        {product.state === 'archived' ? (
                          <button type="button" className="link-btn" onClick={() => archiveProduct(product.id, 'published')}>
                            Restore
                          </button>
                        ) : (
                          <button type="button" className="link-btn" onClick={() => archiveProduct(product.id, 'archived')}>
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 ? <p className="mono empty-inline">No products match that filter.</p> : null}
            </div>
          </div>
        ) : null}

        {tab === 'categories' ? (
          <div className="admin-categories">
            <div className="admin-toolbar">
              <label className="field field--inline">
                <span className="mono">New category</span>
                <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Textile" />
              </label>
              <button type="button" className="btn btn--solid btn--sm" onClick={addCategory}>
                Add
              </button>
            </div>

            <ul className="category-list">
              {db.categories.map((category) => {
                const count = db.products.filter((product) => product.category === category.name).length;
                return (
                  <li key={category.id}>
                    <div>
                      <p className="category-list__name">{category.name}</p>
                      <p className="mono">{count} piece{count === 1 ? '' : 's'}</p>
                    </div>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => removeCategory(category.id)}
                      disabled={count > 0}
                      title={count > 0 ? 'Remove its products first' : 'Remove category'}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {tab === 'projects' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Rooms</th>
                  <th>Area</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <span className="admin-table__name">{project.name}</span>
                    </td>
                    <td>{project.owner}</td>
                    <td>
                      <select
                        value={project.status}
                        onChange={(event) => setProjectStatus(project.id, event.target.value as 'draft' | 'in-review' | 'ready')}
                        className="inline-select"
                      >
                        <option value="draft">Draft</option>
                        <option value="in-review">In review</option>
                        <option value="ready">Ready</option>
                      </select>
                    </td>
                    <td className="mono">{project.rooms}</td>
                    <td className="mono">{project.area ? `${project.area.toFixed(1)} m²` : '—'}</td>
                    <td className="mono">{formatDate(project.updatedAt)}</td>
                    <td className="admin-table__actions">
                      <button type="button" className="link-btn" onClick={() => removeProject(project.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {db.projects.length === 0 ? <p className="mono empty-inline">No plans in the studio yet.</p> : null}
          </div>
        ) : null}

        {tab === 'people' ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Source</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.users.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <div className="person-cell">
                        <span className="shell__avatar shell__avatar--sm" aria-hidden="true">
                          {initials(person.name)}
                        </span>
                        <span className="admin-table__name">{person.name}</span>
                      </div>
                    </td>
                    <td className="mono">{person.email}</td>
                    <td>
                      <select
                        value={person.role}
                        onChange={(event) => setUserRole(person.id, event.target.value as 'client' | 'designer' | 'admin')}
                        disabled={person.id === user.id}
                        className="inline-select"
                      >
                        <option value="client">Client</option>
                        <option value="designer">Designer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="mono">{person.source}</td>
                    <td className="mono">{formatDate(person.createdAt)}</td>
                    <td className="admin-table__actions">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => removeUser(person.id)}
                        disabled={person.id === user.id}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <ProductDialog
        open={productOpen}
        onClose={() => {
          setProductOpen(false);
          setEditing(null);
        }}
        initial={editing}
        categories={db.categories.map((entry) => entry.name)}
        onSave={saveProduct}
      />
    </div>
  );
}
