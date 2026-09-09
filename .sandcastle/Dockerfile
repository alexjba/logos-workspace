FROM debian:bookworm-slim

RUN apt-get update && apt-get install -yq --no-install-recommends \
    ca-certificates curl xz-utils git jq sudo gnupg procps \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update && apt-get install -yq --no-install-recommends nodejs gh \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

ARG AGENT_UID=1000
ARG AGENT_GID=1000
RUN (getent group $AGENT_GID || groupadd -g $AGENT_GID agent) \
 && useradd -o -u $AGENT_UID -g $AGENT_GID -m -d /home/agent -s /bin/bash agent \
 && mkdir -m 0755 /nix && chown $AGENT_UID:$AGENT_GID /nix
# Nix is installed at first sandbox start into the mounted /nix (adapter/bootstrap.sh).
RUN curl -fsSL https://nixos.org/nix/install -o /opt/nix-install.sh

USER ${AGENT_UID}:${AGENT_GID}
ENV HOME=/home/agent
RUN mkdir -p /home/agent/.config/nix && printf '%s\n' \
    'experimental-features = nix-command flakes' \
    'sandbox = false' \
    'substituters = https://cache.nixos.org https://logos-co.cachix.org' \
    'trusted-public-keys = cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= logos-co.cachix.org-1:12K8609ho1pCt0erUQrOrs/KmOuhWq/EhVwhzQRb35E=' \
    > /home/agent/.config/nix/nix.conf
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/agent/.local/bin:/nix/var/nix/profiles/default/bin:/home/agent/.nix-profile/bin:$PATH"
WORKDIR /home/agent
ENTRYPOINT ["sleep", "infinity"]
