from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import base64
from typing import Dict, Any


class EncryptionError(Exception):
    pass


class DecryptionError(Exception):
    pass

class EncryptionService:
    def __init__(self):
        self.master_key = os.getenv('ENCRYPTION_MASTER_KEY')
        if not self.master_key or len(self.master_key) < 16:
            raise EncryptionError("ENCRYPTION_MASTER_KEY is missing or too short")
        self.method = 'AES-256-GCM'
    
    async def encrypt_document(
        self,
        content: bytes,
        metadata: Dict[str, Any]
    ) -> bytes:
        """Encrypt document content using AES-GCM"""
        try:
            # Generate document-specific key
            doc_key = await self._generate_document_key(metadata)
            
            # Derive per-document salt; persist alongside ciphertext
            salt = os.urandom(16)
            doc_key = await self._generate_document_key(metadata, salt)

            # Create AESGCM instance and nonce
            aesgcm = AESGCM(doc_key)
            nonce = os.urandom(12)
            
            # Encrypt content
            encrypted_content = aesgcm.encrypt(
                nonce,
                content,
                metadata.get('additional_data', None)
            )
            
            # Return salt + nonce + ciphertext so decrypt can reconstruct
            return salt + nonce + encrypted_content
            
        except Exception as e:
            raise EncryptionError(f"Encryption failed: {str(e)}")
    
    async def decrypt_document(
        self,
        encrypted_content: bytes,
        metadata: Dict[str, Any]
    ) -> bytes:
        """Decrypt document content"""
        try:
            # Extract salt, nonce, ciphertext
            if len(encrypted_content) < 28:
                raise DecryptionError("Encrypted payload too short")
            salt = encrypted_content[:16]
            nonce = encrypted_content[16:28]
            ciphertext = encrypted_content[28:]

            # Generate document-specific key using extracted salt
            doc_key = await self._generate_document_key(metadata, salt)
            
            # Create AESGCM instance
            aesgcm = AESGCM(doc_key)
            
            # Decrypt content
            return aesgcm.decrypt(
                nonce,
                ciphertext,
                metadata.get('additional_data', None)
            )
            
        except Exception as e:
            raise DecryptionError(f"Decryption failed: {str(e)}")
    
    async def _generate_document_key(
        self,
        metadata: Dict[str, Any],
        salt: bytes
    ) -> bytes:
        """Generate document-specific encryption key"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000
        )
        
        # Combine master key with document metadata
        key_material = f"{self.master_key}:{metadata.get('doc_id')}:{metadata.get('version')}"
        return base64.urlsafe_b64encode(kdf.derive(key_material.encode())) 