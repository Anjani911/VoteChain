import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_action(db: Session, action: str, actor_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> AuditLog:
    """
    Records an administrative action in the audit log.
    Ensures no passwords, authorization tokens, or plaintext ballot selections are stored.
    """
    safe_metadata = {}
    if metadata:
        # Sanitize metadata to exclude sensitive keys
        sanitized = {}
        for k, v in metadata.items():
            if any(sensitive in k.lower() for sensitive in ["password", "token", "key", "secret", "candidate_id", "choice"]):
                continue
            sanitized[k] = v
        safe_metadata = sanitized

    log_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        metadata_json=json.dumps(safe_metadata)
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
