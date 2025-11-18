from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def transaction_context(client: AsyncIOMotorClient):
    """
    MongoDB transaction context manager for atomic operations.
    
    Usage:
        async with transaction_context(mongo_client) as session:
            # Perform operations with session
            await collection.insert_one({...}, session=session)
            await collection.update_one({...}, session=session)
            # Transaction will commit automatically if no exception
    
    If any exception occurs, the transaction will automatically rollback.
    
    Args:
        client: AsyncIOMotorClient instance
    
    Yields:
        session: ClientSession for transaction
    
    Raises:
        Exception: Any exception from the operations will trigger rollback
    """
    async with client.start_session() as session:
        try:
            async with session.start_transaction():
                logger.info("MongoDB transaction started")
                yield session
                logger.info("MongoDB transaction committed successfully")
        except Exception as e:
            logger.error(f"MongoDB transaction failed: {str(e)}")
            # Transaction will rollback automatically
            raise Exception(f"Transaction failed: {str(e)}") from e
