        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => {
            if (response?.credential) onCredential(response.credential);
          },
          ux_mode: 'popup',
          use_fedcm_for_prompt: true,
          itp_support: true,
          login_uri: `${window.location.origin}/api/auth/google/gsi-callback`
        });
