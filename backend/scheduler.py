import logging
import threading
import time
from datetime import datetime, timedelta

from sqlalchemy import and_

from database import SessionLocal
from models import Book, BorrowRecord, BorrowStatus, Notification

logger = logging.getLogger(__name__)


def _today_range():
    now = datetime.utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end


def check_and_create_notifications(db=None):
    """检查借阅单并生成到期/逾期提醒。"""
    close_db = db is None
    if db is None:
        db = SessionLocal()

    try:
        today_start, today_end = _today_range()
        records = (
            db.query(BorrowRecord)
            .filter(BorrowRecord.status == BorrowStatus.BORROWED)
            .all()
        )

        created_count = 0
        for record in records:
            due_date = record.expected_return_date
            if due_date is None:
                continue

            days_until_due = (due_date.date() - today_start.date()).days
            if days_until_due > 3:
                continue

            existing = (
                db.query(Notification)
                .filter(
                    Notification.borrow_record_id == record.id,
                    Notification.user_id == record.user_id,
                    Notification.created_at >= today_start,
                    Notification.created_at < today_end,
                )
                .first()
            )
            if existing:
                continue

            book = db.query(Book).filter(Book.id == record.book_id).first()
            book_title = book.title if book else "未知图书"

            if days_until_due < 0:
                message = f"图书《{book_title}》已逾期 {abs(days_until_due)} 天，请尽快归还。"
            elif days_until_due == 0:
                message = f"图书《{book_title}》今天到期，请及时归还。"
            else:
                message = f"图书《{book_title}》将在 {days_until_due} 天后到期，请及时归还。"

            notification = Notification(
                user_id=record.user_id,
                borrow_record_id=record.id,
                message=message,
                is_read=0,
            )
            db.add(notification)
            created_count += 1

        db.commit()
        logger.info(f"Scheduled notification check completed, created {created_count} notifications.")
        return created_count
    except Exception:
        logger.exception("Failed to run scheduled notification check")
        db.rollback()
        raise
    finally:
        if close_db:
            db.close()


def _scheduler_loop(interval_seconds: int = 86400):
    """后台线程：启动时立即执行一次，之后按间隔执行。"""
    logger.info("Notification scheduler thread started")
    while True:
        try:
            check_and_create_notifications()
        except Exception:
            logger.exception("Scheduler loop error")
        time.sleep(interval_seconds)


def start_scheduler(interval_seconds: int = 86400):
    """启动定时任务线程。"""
    thread = threading.Thread(
        target=_scheduler_loop,
        args=(interval_seconds,),
        daemon=True,
        name="borrow-notification-scheduler",
    )
    thread.start()
    return thread
