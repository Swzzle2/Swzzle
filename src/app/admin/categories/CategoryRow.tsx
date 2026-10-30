"use client";

import { useActionState } from "react";
import type { Category } from "@/lib/types";
import { createCategory, deleteCategory, updateCategory } from "./actions";

export function CategoryRow({ category, productCount }: { category: Category; productCount: number }) {
  const [saveState, save, saving] = useActionState(updateCategory, {});
  const [delState, del, deleting] = useActionState(deleteCategory, {});
  const error = saveState.error ?? delState.error;

  return (
    <tr>
      <td colSpan={5}>
        <form action={save} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={category.id} />
          <input name="name" defaultValue={category.name} required className="field w-56" />
          <input name="slug" defaultValue={category.slug} className="field w-48 font-mono" />
          <input name="sort_order" type="number" defaultValue={category.sort_order} className="field w-20" />
          <span className="w-24 text-sm text-muted">{productCount} products</span>
          <button className="btn btn-ghost btn-sm" disabled={saving}>{saving ? "…" : "Save"}</button>
          <button
            formAction={del}
            className="btn btn-ghost btn-sm text-danger"
            disabled={deleting}
            onClick={(e) => {
              if (!confirm(`Delete "${category.name}"? Its ${productCount} products will have no category.`)) e.preventDefault();
            }}
          >
            Delete
          </button>
          {saveState.ok && !saving && <span className="text-sm text-ok">Saved</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
        </form>
      </td>
    </tr>
  );
}

export function NewCategoryForm() {
  const [state, action, pending] = useActionState(createCategory, {});
  return (
    <form action={action} className="mb-6 flex flex-wrap items-end gap-2">
      <div>
        <label className="label">Name</label>
        <input name="name" required className="field w-56" />
      </div>
      <div>
        <label className="label">Slug (optional)</label>
        <input name="slug" className="field w-48 font-mono" />
      </div>
      <div>
        <label className="label">Sort</label>
        <input name="sort_order" type="number" defaultValue={0} className="field w-20" />
      </div>
      <button className="btn btn-sm" disabled={pending}>Add category</button>
      {state.error && <span className="text-sm text-danger">{state.error}</span>}
    </form>
  );
}
