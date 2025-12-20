import { Societe } from "../../../@types/shared";
import { TransportApiService } from "../../../services/api";

export const migrateSocietesToDB = async (): Promise<{
  success: number;
  errors: number;
}> => {
  try {
    // Récupérer les sociétés depuis localStorage
    const societesLocal = localStorage.getItem("societes_locales");
    if (!societesLocal) {
      console.log("Aucune société à migrer depuis localStorage");
      return { success: 0, errors: 0 };
    }

    const societes: Societe[] = JSON.parse(societesLocal);
    console.log(
      `Migration de ${societes.length} sociétés vers la base de données...`
    );

    let success = 0;
    let errors = 0;

    for (const societe of societes) {
      try {
        // Vérifier si la société existe déjà (par nom)
        const existingSocietes = await TransportApiService.searchSocietes(
          societe.nom
        );
        const exists = existingSocietes.some((s) => s.nom === societe.nom);

        if (!exists) {
          // Créer la société dans la base de données
          await TransportApiService.createSociete({
            nom: societe.nom,
            adresse: societe.adresse,
            telephone: societe.telephone,
            matriculef: societe.matriculef,
          });
          success++;
          console.log(`✅ Société migrée: ${societe.nom}`);
        } else {
          console.log(`⚠️ Société déjà existante: ${societe.nom}`);
          success++; // On compte quand même comme succès
        }
      } catch (error) {
        errors++;
        console.error(`❌ Erreur migration société ${societe.nom}:`, error);
      }

      // Petite pause pour éviter de surcharger le serveur
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`Migration terminée: ${success} succès, ${errors} erreurs`);

    // Optionnel: vider localStorage après migration réussie
    if (errors === 0) {
      localStorage.removeItem("societes_locales");
      console.log("✅ localStorage nettoyé");
    }

    return { success, errors };
  } catch (error) {
    console.error("Erreur lors de la migration:", error);
    return { success: 0, errors: 1 };
  }
};
