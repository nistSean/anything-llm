import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const SCHEMA_PRESETS = {
  "roo-code": {
    name: "Roo Code",
    description: "codeChunk → text, filePath → title, segmentHash → docId",
    mapping: JSON.stringify({
      text: "codeChunk",
      title: "filePath",
      docId: "segmentHash",
    }),
  },
  custom: {
    name: "Custom Schema Mapping",
    description: "Define your own field mappings",
    mapping: "",
  },
};

export default function ExternalCollection({ workspace, setHasChanges }) {
  const { t } = useTranslation();
  const [useExternal, setUseExternal] = useState(
    !!workspace?.externalVectorCollection
  );
  const [schemaPreset, setSchemaPreset] = useState(() => {
    if (!workspace?.externalVectorSchemaMapping) return "roo-code";
    // Check if the mapping matches a preset
    const currentMapping = workspace.externalVectorSchemaMapping;
    const rooCodeMapping = SCHEMA_PRESETS["roo-code"].mapping;
    if (currentMapping === rooCodeMapping) return "roo-code";
    return "custom";
  });
  const [customMapping, setCustomMapping] = useState(
    workspace?.externalVectorSchemaMapping || ""
  );
  const [mappingError, setMappingError] = useState("");

  // Validate JSON when custom mapping changes
  useEffect(() => {
    if (schemaPreset !== "custom" || !customMapping) {
      setMappingError("");
      return;
    }
    try {
      JSON.parse(customMapping);
      setMappingError("");
    } catch (e) {
      setMappingError("Invalid JSON format");
    }
  }, [customMapping, schemaPreset]);

  const handleSchemaPresetChange = (e) => {
    const newPreset = e.target.value;
    setSchemaPreset(newPreset);
    setHasChanges(true);

    if (newPreset !== "custom") {
      setCustomMapping(SCHEMA_PRESETS[newPreset].mapping);
    }
  };

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col">
        <label className="block input-label">
          {t("vector-workspace.external.title", "External Vector Collection")}
        </label>
        <p className="text-white text-opacity-60 text-xs font-medium py-1.5">
          {t(
            "vector-workspace.external.description",
            "Use an existing Qdrant collection instead of creating a new one. This is useful for connecting to collections created by external tools like Roo Code."
          )}
        </p>
      </div>

      <div className="flex items-center gap-x-3">
        <input
          type="checkbox"
          name="useExternalCollection"
          checked={useExternal}
          onChange={(e) => {
            setUseExternal(e.target.checked);
            setHasChanges(true);
          }}
          className="w-4 h-4"
        />
        <label className="text-white text-sm">
          {t("vector-workspace.external.use-external", "Use external collection")}
        </label>
      </div>

      {useExternal && (
        <>
          <div className="flex flex-col">
            <label className="block input-label">
              {t("vector-workspace.external.collection-name", "Collection Name")}
            </label>
            <input
              name="externalVectorCollection"
              type="text"
              defaultValue={workspace?.externalVectorCollection || ""}
              className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5 mt-2"
              placeholder={t(
                "vector-workspace.external.collection-placeholder",
                "ws-549bb28398322085"
              )}
              onChange={() => setHasChanges(true)}
            />
            <p className="text-white text-opacity-60 text-xs font-medium py-1">
              {t(
                "vector-workspace.external.collection-help",
                "The exact name of the Qdrant collection to use."
              )}
            </p>
          </div>

          <div className="flex flex-col">
            <label className="block input-label">
              {t("vector-workspace.external.schema-preset", "Schema Preset")}
            </label>
            <select
              name="schemaPreset"
              value={schemaPreset}
              className="border-none bg-theme-settings-input-bg text-white text-sm mt-2 rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
              onChange={handleSchemaPresetChange}
            >
              {Object.entries(SCHEMA_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name}
                </option>
              ))}
            </select>
            <p className="text-white text-opacity-60 text-xs font-medium py-1">
              {SCHEMA_PRESETS[schemaPreset]?.description}
            </p>
          </div>

          {schemaPreset === "custom" && (
            <div className="flex flex-col">
              <label className="block input-label">
                {t("vector-workspace.external.custom-mapping", "Custom Schema Mapping (JSON)")}
              </label>
              <textarea
                name="externalVectorSchemaMapping"
                value={customMapping}
                onChange={(e) => {
                  setCustomMapping(e.target.value);
                  setHasChanges(true);
                }}
                className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5 mt-2 font-mono"
                placeholder='{"text": "content", "title": "name", "docId": "id"}'
                rows={4}
              />
              {mappingError && (
                <p className="text-red-400 text-xs font-medium py-1">
                  {mappingError}
                </p>
              )}
              <p className="text-white text-opacity-60 text-xs font-medium py-1">
                {t(
                  "vector-workspace.external.mapping-help",
                  "Map external fields to AnythingLLM expected fields: text, title, docId"
                )}
              </p>
            </div>
          )}

          {/* Hidden field to store the actual schema mapping value */}
          {schemaPreset !== "custom" && (
            <input
              type="hidden"
              name="externalVectorSchemaMapping"
              value={SCHEMA_PRESETS[schemaPreset]?.mapping || ""}
            />
          )}

          <div className="flex items-center gap-x-3">
            <input
              type="checkbox"
              name="externalVectorReadOnly"
              defaultChecked={workspace?.externalVectorReadOnly !== false}
              onChange={() => setHasChanges(true)}
              className="w-4 h-4"
            />
            <label className="text-white text-sm">
              {t(
                "vector-workspace.external.read-only",
                "Read-only (prevent adding documents to this collection)"
              )}
            </label>
          </div>

          <div className="flex items-center gap-x-3 mt-2">
            <input
              type="checkbox"
              name="externalVectorIncludeMetadata"
              defaultChecked={workspace?.externalVectorIncludeMetadata || false}
              onChange={() => setHasChanges(true)}
              className="w-4 h-4"
            />
            <label className="text-white text-sm">
              {t(
                "vector-workspace.external.include-metadata",
                "Include metadata in LLM context (file path, line numbers)"
              )}
            </label>
          </div>
          <p className="text-white text-opacity-60 text-xs font-medium pl-7 mt-1">
            {t(
              "vector-workspace.external.include-metadata-help",
              "When enabled, file paths and line numbers are prepended to each context snippet, helping the LLM provide more precise code references."
            )}
          </p>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-2">
            <p className="text-yellow-200 text-xs">
              <strong>⚠️ Important:</strong>{" "}
              {t(
                "vector-workspace.external.embedding-warning",
                "The embedding model used must match the model that created the vectors in the external collection. Mismatched models will result in poor or nonsensical search results."
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
