// src/Hooks/useEmailDocument.js
//
// Sending a document by email: documents only ever go to their owner's
// registered address. The backend says who that is, the user confirms in
// the app's modal (document, member, address), then it is sent.
import { useCallback, useContext } from 'react';
import { UserContext } from '../Context/dataCont';
import { useModal } from '../Context/ModalContext';
import { useError } from '../Context/ErrorContext';
import { emailDocument, getEmailRecipient } from '../Components/documents';

/** Returns send(templateKey, entityId) → true when the email was sent. */
export function useEmailDocument() {
  const { authData, setAuthData } = useContext(UserContext);
  const { confirm } = useModal();
  const { showSuccess, showError } = useError();

  return useCallback(
    async (templateKey, entityId) => {
      const auth = { token: authData?.token, setAuthData };

      let recipient;
      try {
        recipient = await getEmailRecipient(templateKey, entityId, auth);
      } catch (err) {
        showError(err.message);
        return false;
      }

      const who = recipient.name ? `${recipient.name} (${recipient.email})` : recipient.email;
      const confirmed = await confirm({
        title: 'Envoyer par email',
        message:
          `« ${recipient.documentName} » sera envoyé à ${who}. ` +
          "Les documents ne sont envoyés qu'à l'adresse email enregistrée du membre.",
      });
      if (!confirmed) return false;

      try {
        const result = await emailDocument(templateKey, entityId, null, auth);
        showSuccess(`Document envoyé à ${result?.recipient || recipient.email}`);
        return true;
      } catch (err) {
        showError(err.message || "Échec de l'envoi de l'email");
        return false;
      }
    },
    [authData?.token, setAuthData, confirm, showSuccess, showError],
  );
}
