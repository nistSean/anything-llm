import Workspace from "@/models/workspace";
import System from "@/models/system";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";
import { useRef, useState, useEffect } from "react";
import VectorDBIdentifier from "./VectorDBIdentifier";
import MaxContextSnippets from "./MaxContextSnippets";
import DocumentSimilarityThreshold from "./DocumentSimilarityThreshold";
import ResetDatabase from "./ResetDatabase";
import VectorCount from "./VectorCount";
import VectorSearchMode from "./VectorSearchMode";
import ExternalCollection from "./ExternalCollection";
import CTAButton from "@/components/lib/CTAButton";

export default function VectorDatabase({ workspace }) {
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vectorDbProvider, setVectorDbProvider] = useState(null);
  const formEl = useRef(null);

  useEffect(() => {
    async function fetchVectorDbProvider() {
      const settings = await System.keys();
      setVectorDbProvider(settings?.VectorDB || "lancedb");
    }
    fetchVectorDbProvider();
  }, []);

  const handleUpdate = async (e) => {
    setSaving(true);
    e.preventDefault();
    const data = {};
    const form = new FormData(formEl.current);
    for (var [key, value] of form.entries()) data[key] = castToType(key, value);

    // Handle checkbox for useExternalCollection
    // If unchecked, we should clear the external collection settings
    if (!form.has("useExternalCollection") || !form.get("useExternalCollection")) {
      data.externalVectorCollection = null;
      data.externalVectorSchemaMapping = null;
      data.externalVectorReadOnly = true;
    }

    // Handle read-only checkbox (unchecked means false)
    if (form.has("useExternalCollection") && form.get("useExternalCollection")) {
      data.externalVectorReadOnly = form.has("externalVectorReadOnly");
    }

    const { workspace: updatedWorkspace, message } = await Workspace.update(
      workspace.slug,
      data
    );
    if (!!updatedWorkspace) {
      showToast("Workspace updated!", "success", { clear: true });
    } else {
      showToast(`Error: ${message}`, "error", { clear: true });
    }
    setSaving(false);
    setHasChanges(false);
  };

  // Check if workspace is using an external collection and it's read-only
  const isExternalReadOnly =
    workspace?.externalVectorCollection &&
    workspace?.externalVectorReadOnly !== false;

  if (!workspace) return null;
  return (
    <div className="w-full relative">
      <form
        ref={formEl}
        onSubmit={handleUpdate}
        className="w-1/2 flex flex-col gap-y-6"
      >
        {hasChanges && (
          <div className="absolute top-0 right-0">
            <CTAButton type="submit">
              {saving ? "Updating..." : "Update Workspace"}
            </CTAButton>
          </div>
        )}
        <div className="flex items-start gap-x-5">
          <VectorDBIdentifier workspace={workspace} />
          <VectorCount reload={true} workspace={workspace} />
        </div>

        {/* External Collection Configuration - only show for Qdrant */}
        {vectorDbProvider === "qdrant" && (
          <ExternalCollection
            workspace={workspace}
            setHasChanges={setHasChanges}
          />
        )}

        <VectorSearchMode workspace={workspace} setHasChanges={setHasChanges} />
        <MaxContextSnippets
          workspace={workspace}
          setHasChanges={setHasChanges}
        />
        <DocumentSimilarityThreshold
          workspace={workspace}
          setHasChanges={setHasChanges}
        />

        {/* Only show reset for non-external or non-readonly collections */}
        {!isExternalReadOnly && <ResetDatabase workspace={workspace} />}
      </form>
    </div>
  );
}
