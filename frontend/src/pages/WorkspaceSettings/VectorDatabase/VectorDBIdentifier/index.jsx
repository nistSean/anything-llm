import { useTranslation } from "react-i18next";

export default function VectorDBIdentifier({ workspace }) {
  const { t } = useTranslation();
  const isExternal = !!workspace?.externalVectorCollection;
  const identifier = isExternal
    ? workspace.externalVectorCollection
    : workspace?.slug;

  return (
    <div>
      <h3 className="input-label">{t("vector-workspace.identifier")}</h3>
      <p className="text-white/60 text-xs font-medium py-1">
        {isExternal && (
          <span className="text-blue-400">
            {t("vector-workspace.external-collection", "External Collection")}
          </span>
        )}
      </p>
      <p className="text-white/60 text-sm">{identifier}</p>
    </div>
  );
}
