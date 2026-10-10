import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api, errMsg, imageSrc } from "../../lib/api";
import { money, dateShort } from "../../lib/format";
import { PageHead, ConfirmDialog, Empty, Modal } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";

const CATEGORY_OPTIONS = [
  "Biryani", "Meals", "South Indian", "Starters", "Snacks", "Burgers & Pizza",
  "Rolls", "Sandwich", "Noodles", "Pasta", "Pure Veg", "Salad",
  "Cool Drinks", "Juices & Shakes", "Coffee & Tea", "Cake", "Deserts",
];

const EditProductModal = ({ item, onClose, onSaved }) => {
  const [name, setName] = useState(item.name || "");
  const [description, setDescription] = useState(item.description || "");
  const [category, setCategory] = useState(item.category || "Salad");
  const [price, setPrice] = useState(item.price || "");

  const getIds = (arr) => {
    if (!arr || !Array.isArray(arr)) return [];
    return arr.map((x) => (typeof x === "object" && x._id ? x._id : x));
  };

  const [upsells, setUpsells] = useState(getIds(item.upsells));
  const [crossSells, setCrossSells] = useState(getIds(item.crossSells));
  const [relatedProducts, setRelatedProducts] = useState(getIds(item.relatedProducts));
  const [existingFoods, setExistingFoods] = useState([]);

  useEffect(() => {
    api.get("/api/food/list").then((res) => {
      if (res.data.success) {
        setExistingFoods(res.data.data.filter((f) => f._id !== item._id));
      }
    });
  }, [item._id]);

  const toggleSelection = (list, setList, id) => {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const initialExisting = item.images && item.images.length ? item.images : (item.image ? [item.image] : []);
  const [existingImages, setExistingImages] = useState(initialExisting);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const handlePickNewFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setNewImageFiles((prev) => [...prev, ...files].slice(0, 10 - existingImages.length));
    }
  };

  const removeExisting = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (existingImages.length === 0 && newImageFiles.length === 0) {
      toast.error("Please keep or add at least one photo for the product.");
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("id", item._id);
      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("price", price);
      formData.append("existingImages", JSON.stringify(existingImages));
      formData.append("upsells", JSON.stringify(upsells));
      formData.append("crossSells", JSON.stringify(crossSells));
      formData.append("relatedProducts", JSON.stringify(relatedProducts));

      newImageFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await api.post("/api/food/update", formData);
      if (response.data.success) {
        toast.success("Product updated successfully with associations!");
        onSaved();
      } else {
        toast.error(response.data.message || "Failed to update product");
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to update product"));
    } finally {
      setBusy(false);
    }
  };

  const totalCount = existingImages.length + newImageFiles.length;

  return (
    <Modal
      size="lg"
      title={`Edit ${item.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" form="edit-product-form" disabled={busy}>
            {busy && <span className="spinner" />} Save Changes
          </button>
        </>
      }
    >
      <form id="edit-product-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="field">
          <label style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Product Photos ({totalCount} / 10 max)</span>
          </label>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
            Add 5 to 10 photos of your dish from different angles. First photo is the primary cover image.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10, marginBottom: 12 }}>
            {existingImages.map((img, idx) => (
              <div key={`exist-${idx}`} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <img src={imageSrc(img)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {idx === 0 && newImageFiles.length === 0 && (
                  <span style={{ position: "absolute", bottom: 2, left: 2, background: "var(--primary)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>
                    Primary
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeExisting(idx)}
                  style={{
                    position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none",
                    borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "grid", placeItems: "center", fontSize: 12
                  }}
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}

            {newImageFiles.map((file, idx) => (
              <div key={`new-${idx}`} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: "2px solid var(--primary)", background: "var(--surface-2)" }}>
                <img src={URL.createObjectURL(file)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {existingImages.length === 0 && idx === 0 && (
                  <span style={{ position: "absolute", bottom: 2, left: 2, background: "var(--primary)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>
                    Primary
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeNewFile(idx)}
                  style={{
                    position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none",
                    borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "grid", placeItems: "center", fontSize: 12
                  }}
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {totalCount < 10 && (
            <label className="btn btn-outline" style={{ cursor: "pointer", width: "fit-content", fontSize: 13 }}>
              <Icon name="plus" size={16} /> Add More Photos (Select Multiple)
              <input type="file" multiple accept="image/*" hidden onChange={handlePickNewFiles} />
            </label>
          )}
        </div>

        <div className="field">
          <label htmlFor="edit-name">Product Name</label>
          <input id="edit-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label htmlFor="edit-cat">Category</label>
            <select id="edit-cat" className="select" required value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="edit-price">Price (₹)</label>
            <input
              id="edit-price"
              type="number"
              step="0.01"
              min="0"
              className="input num"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="edit-desc">Description</label>
          <textarea
            id="edit-desc"
            className="textarea"
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* PRODUCT ASSOCIATIONS IN EDIT MODAL */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
            🔗 Linked Recommendations & Associations
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>
              🍱 Cross-Sells ("Complete Your Meal" - Dips, Drinks, Sides)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 100, overflowY: 'auto', padding: 2 }}>
              {existingFoods.map((f) => {
                const selected = crossSells.includes(f._id);
                return (
                  <button
                    key={f._id}
                    type="button"
                    onClick={() => toggleSelection(crossSells, setCrossSells, f._id)}
                    style={{
                      background: selected ? '#f26b1d' : '#fff',
                      color: selected ? '#fff' : '#334155',
                      border: selected ? '1px solid #f26b1d' : '1px solid #cbd5e1',
                      borderRadius: 16, padding: '3px 8px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    {selected ? '✓ ' : '+ '}{f.name} (₹{f.price})
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>
              ⭐ Up-Sells (Premium/Larger Combo Alternatives)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 100, overflowY: 'auto', padding: 2 }}>
              {existingFoods.map((f) => {
                const selected = upsells.includes(f._id);
                return (
                  <button
                    key={f._id}
                    type="button"
                    onClick={() => toggleSelection(upsells, setUpsells, f._id)}
                    style={{
                      background: selected ? '#0284c7' : '#fff',
                      color: selected ? '#fff' : '#334155',
                      border: selected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      borderRadius: 16, padding: '3px 8px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    {selected ? '✓ ' : '+ '}{f.name} (₹{f.price})
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>
              🍲 Related Products ("You Might Also Like")
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 100, overflowY: 'auto', padding: 2 }}>
              {existingFoods.map((f) => {
                const selected = relatedProducts.includes(f._id);
                return (
                  <button
                    key={f._id}
                    type="button"
                    onClick={() => toggleSelection(relatedProducts, setRelatedProducts, f._id)}
                    style={{
                      background: selected ? '#16a34a' : '#fff',
                      color: selected ? '#fff' : '#334155',
                      border: selected ? '1px solid #16a34a' : '1px solid #cbd5e1',
                      borderRadius: 16, padding: '3px 8px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    {selected ? '✓ ' : '+ '}{f.name} (₹{f.price})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

const List = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("newest");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [removing, setRemoving] = useState(false);

  const fetchlist = async () => {
    try {
      const response = await api.get("/api/food/list");
      if (response.data.success) setList(response.data.data);
      else toast.error("Failed to load products");
    } catch (err) {
      toast.error(errMsg(err, "Network error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchlist();
    document.title = "Products · Inofex Restaurant Admin";
  }, []);

  const categories = useMemo(() => {
    const counts = {};
    for (const i of list) counts[i.category] = (counts[i.category] || 0) + 1;
    return [["All", list.length], ...Object.entries(counts).sort()];
  }, [list]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const r = list.filter(
      (i) =>
        (cat === "All" || i.category === cat) &&
        (!needle || i.name.toLowerCase().includes(needle) || i.description?.toLowerCase().includes(needle))
    );
    const by = {
      newest: (a, b) => (b._id > a._id ? 1 : -1),
      name: (a, b) => a.name.localeCompare(b.name),
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
    }[sort];
    return [...r].sort(by);
  }, [list, q, cat, sort]);

  const remove = async () => {
    setRemoving(true);
    try {
      const response = await api.post("/api/food/remove", { id: confirm._id });
      if (response.data.success) {
        toast.success(`${confirm.name} removed`);
        setList((l) => l.filter((i) => i._id !== confirm._id));
        setConfirm(null);
      } else toast.error(response.data.message || "Failed to remove item");
    } catch (err) {
      toast.error(errMsg(err, "Failed to remove item"));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="page">
      <PageHead crumbs={["Catalog", "Products"]} title="Products" sub={`${list.length} items on the menu`}>
        {can("products.create") && (
          <button className="btn btn-primary" onClick={() => navigate("/products/new")}>
            <Icon name="plus" size={18} />
            Add product
          </button>
        )}
      </PageHead>

      <div className="card">
        <div className="card-pad" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", paddingBottom: 12 }}>
          <div className="tabs" style={{ flex: "1 1 100%" }}>
            {categories.map(([c, n]) => (
              <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>
                {c}
                <span className="count">{n}</span>
              </button>
            ))}
          </div>
          <div className="search" style={{ flex: "1 1 260px" }}>
            <Icon name="search" size={18} />
            <input className="input" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
          </div>
          <select className="select" style={{ flex: "0 1 200px" }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="priceAsc">Price: low to high</option>
            <option value="priceDesc">Price: high to low</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="right">Price</th>
                <th>Added</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={5}>
                      <div className="skeleton" style={{ height: 44 }} />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <Empty title={list.length ? "No products match" : "No products yet"}>
                      {list.length ? "Try another search or category." : "Add your first dish to get started."}
                    </Empty>
                  </td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
                        <img
                          src={imageSrc(item.image)}
                          alt=""
                          loading="lazy"
                          style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", background: "var(--surface-2)", flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ fontWeight: 600 }}>{item.name}</strong>
                          <div
                            className="muted"
                            style={{ fontSize: 12, maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                          >
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-blue">{item.category}</span>
                    </td>
                    <td className="right num">
                      <strong>{money(item.price)}</strong>
                    </td>
                    <td className="muted">{dateShort(item.createdAt || parseInt(item._id.slice(0, 8), 16) * 1000)}</td>
                    <td className="right" style={{ whiteSpace: "nowrap" }}>
                      {can("products.update") && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditing(item)}
                          aria-label={`Edit ${item.name}`}
                          style={{ marginRight: 6 }}
                        >
                          <Icon name="edit" size={16} />
                          Edit
                        </button>
                      )}
                      {can("products.delete") && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(item)} aria-label={`Remove ${item.name}`}>
                          <Icon name="trash" size={16} />
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditProductModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetchlist();
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          danger
          title="Remove product?"
          confirmLabel="Remove"
          busy={removing}
          message={`“${confirm.name}” will be removed from the menu and its image deleted. Existing orders keep their copy of the item.`}
          onConfirm={remove}
          onClose={() => !removing && setConfirm(null)}
        />
      )}
    </div>
  );
};

export default List;
