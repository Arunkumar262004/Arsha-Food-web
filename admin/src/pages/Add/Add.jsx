import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api, errMsg } from "../../lib/api";
import { PageHead } from "../../components/ui";
import Icon from "../../components/Icon";
import "./Add.css";

const CATS = ["Salad", "Rolls", "Deserts", "Sandwich", "Cake", "Pure Veg", "Pasta", "Noodles"];
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB = 10;
const EMPTY = { name: "", description: "", price: "", category: "Salad" };

const Add = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState([]); // Array of File objects for N images
  const [data, setData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => { document.title = "Add product · Inofex Restaurant Admin"; }, []);

  const previews = useMemo(() => images.map(img => URL.createObjectURL(img)), [images]);
  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [previews]);

  const onChange = (e) => {
    setData((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: undefined }));
  };

  const pickFiles = (fileList) => {
    if (!fileList || !fileList.length) return;
    const validFiles = [];
    let errMessage = null;

    Array.from(fileList).forEach(file => {
      if (!TYPES.includes(file.type)) {
        errMessage = "Use JPG, PNG, WEBP or GIF images.";
      } else if (file.size > MAX_MB * 1024 * 1024) {
        errMessage = `Each image must be ${MAX_MB} MB or smaller.`;
      } else {
        validFiles.push(file);
      }
    });

    if (errMessage && !validFiles.length) {
      setErrors((e) => ({ ...e, image: errMessage }));
      return;
    }

    setErrors((e) => ({ ...e, image: undefined }));
    setImages((prev) => [...prev, ...validFiles]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e = {};
    if (!images.length) e.image = "Add at least one photo of the dish.";
    if (!data.name.trim()) e.name = "Name is required.";
    if (!data.description.trim()) e.description = "Description is required.";
    if (data.price === "" || Number(data.price) < 0) e.price = "Enter a valid price.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => { setData(EMPTY); setImages([]); setErrors({}); };

  const onSubmit = async (e, addAnother) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", data.name.trim());
      fd.append("description", data.description.trim());
      fd.append("price", Number(data.price));
      fd.append("category", data.category);

      // Append all N uploaded images
      images.forEach((img) => {
        fd.append("images", img);
      });
      // Primary image
      if (images[0]) {
        fd.append("image", images[0]);
      }

      const res = await api.post("/api/food/add", fd);
      if (res.data.success) {
        toast.success(`${data.name} added with ${images.length} photo(s)`);
        reset();
        if (!addAnother) navigate("/products");
      } else toast.error(res.data.message);
    } catch (err) {
      toast.error(errMsg(err, "Could not add product"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHead crumbs={["Catalog", "Products", "New"]} title="Add product" sub="Add a dish to your menu with N number of photos." />

      <form className="add-grid" onSubmit={(e) => onSubmit(e, false)} noValidate>
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 14 }}>
            Product Photos ({images.length})
          </div>

          <label
            className={`drop ${dragging ? "drag" : ""} ${errors.image ? "invalid" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFiles(e.dataTransfer.files); }}
          >
            <div className="drop-empty">
              <span className="drop-icon"><Icon name="image" size={26} /></span>
              <strong>Drop images here or click to upload multiple photos</strong>
              <span>JPG, PNG, WEBP or GIF · up to {MAX_MB} MB each</span>
            </div>
            <input type="file" hidden multiple accept={TYPES.join(",")} onChange={(e) => pickFiles(e.target.files)} />
          </label>

          {/* MULTIPLE IMAGE PREVIEW GALLERY */}
          {previews.length > 0 && (
            <div className="img-gallery-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 10, marginTop: 16 }}>
              {previews.map((src, idx) => (
                <div key={idx} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <img src={src} alt={`Preview ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {idx === 0 && (
                    <span style={{ position: "absolute", bottom: 2, left: 2, background: "var(--primary)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{
                      position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none",
                      borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "grid", placeItems: "center", fontSize: 12
                    }}
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {errors.image && <p className="field-error" style={{ marginTop: 8 }}>{errors.image}</p>}
        </div>

        <div className="card card-pad add-form">
          <div className="card-title">Details</div>
          <div className="field">
            <label htmlFor="p-name">Product name</label>
            <input id="p-name" className={`input ${errors.name ? "invalid" : ""}`} name="name" placeholder="e.g. Grilled Caesar Salad"
              value={data.name} onChange={onChange} maxLength={120} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="p-desc">Description</label>
            <textarea id="p-desc" className={`textarea ${errors.description ? "invalid" : ""}`} name="description" rows={4}
              placeholder="Fresh romaine, parmesan, house dressing…" value={data.description} onChange={onChange} maxLength={1000} />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>
          <div className="field">
            <label>Category</label>
            <div className="seg" role="radiogroup" aria-label="Category" style={{ flexWrap: "wrap" }}>
              {CATS.map((c) => (
                <button type="button" key={c} role="radio" aria-checked={data.category === c}
                  className={data.category === c ? "on" : ""} onClick={() => setData((p) => ({ ...p, category: c }))}>{c}</button>
              ))}
            </div>
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label htmlFor="p-price">Price (₹)</label>
            <input id="p-price" className={`input num ${errors.price ? "invalid" : ""}`} type="number" name="price" placeholder="0.00"
              min="0" step="0.01" value={data.price} onChange={onChange} />
            {errors.price && <span className="field-error">{errors.price}</span>}
          </div>

          <div className="add-actions">
            <button type="button" className="btn btn-ghost" onClick={reset} disabled={loading}>Reset</button>
            <button type="button" className="btn btn-outline" onClick={(e) => onSubmit(e, true)} disabled={loading}>Save & add another</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="spinner" />}{loading ? "Uploading…" : "Save product"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Add;
