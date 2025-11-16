import requests
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service for sending WhatsApp messages via go-whatsapp-web-multidevice API"""
    
    def __init__(self):
        self.base_url = os.environ.get('WHATSAPP_API_URL', 'http://dermapack.net:3001')
        self.username = os.environ.get('WHATSAPP_USERNAME', '')
        self.password = os.environ.get('WHATSAPP_PASSWORD', '')
    
    def send_message(self, phone: str, message: str) -> dict:
        """Send a WhatsApp message
        
        Args:
            phone: Recipient phone number in international format (e.g., 6289685028129)
            message: Message text to send
            
        Returns:
            dict: Response from WhatsApp API
        """
        try:
            # Format phone number for WhatsApp API (add @s.whatsapp.net if not present)
            if '@' not in phone:
                phone = f"{phone}@s.whatsapp.net"
            
            url = f"{self.base_url}/send/message"
            payload = {
                "phone": phone,
                "message": message
            }
            
            response = requests.post(
                url,
                json=payload,
                auth=(self.username, self.password),
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"WhatsApp message sent successfully to {phone}")
                return {"success": True, "data": response.json()}
            else:
                logger.error(f"Failed to send WhatsApp message: {response.status_code} - {response.text}")
                return {"success": False, "error": response.text}
                
        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def send_bulk_messages(self, recipients: list[dict]) -> dict:
        """Send WhatsApp messages to multiple recipients
        
        Args:
            recipients: List of dicts with 'phone' and 'message' keys
            
        Returns:
            dict: Summary of sent messages
        """
        results = {
            "total": len(recipients),
            "success": 0,
            "failed": 0,
            "errors": []
        }
        
        for recipient in recipients:
            phone = recipient.get('phone')
            message = recipient.get('message')
            
            if not phone or not message:
                results['failed'] += 1
                results['errors'].append(f"Missing phone or message for recipient")
                continue
            
            result = self.send_message(phone, message)
            if result['success']:
                results['success'] += 1
            else:
                results['failed'] += 1
                results['errors'].append(f"{phone}: {result['error']}")
        
        return results


# Create singleton instance
whatsapp_service = WhatsAppService()
