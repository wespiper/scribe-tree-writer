"""Export service for analytics data"""

import csv
import io
import json
from datetime import date, datetime
from typing import Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ai_interaction import AIInteraction, Reflection
from app.models.document import Document


class ExportService:
    """Service for exporting analytics data in various formats"""

    async def export_reflections_csv(
        self,
        db: AsyncSession,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> str:
        """Export reflections to CSV format"""
        # Query reflections with document data
        query = (
            select(Reflection)
            .join(Document)
            .where(Document.user_id == user_id)
            .options(selectinload(Reflection.document))
        )

        # Apply date filters if provided
        if start_date:
            query = query.where(
                Reflection.created_at
                >= datetime.combine(start_date, datetime.min.time())
            )
        if end_date:
            query = query.where(
                Reflection.created_at <= datetime.combine(end_date, datetime.max.time())
            )

        # Order by date descending
        query = query.order_by(Reflection.created_at.desc())

        # Execute query
        result = await db.execute(query)
        reflections = result.scalars().all()

        # Create CSV output
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "Document Title",
                "Reflection Content",
                "Quality Score",
                "Word Count",
                "AI Level Granted",
                "Date",
            ],
        )
        writer.writeheader()

        for reflection in reflections:
            writer.writerow(
                {
                    "Document Title": reflection.document.title,
                    "Reflection Content": reflection.content,
                    "Quality Score": reflection.quality_score,
                    "Word Count": len(reflection.content.split()),
                    "AI Level Granted": reflection.ai_level_granted or "N/A",
                    "Date": reflection.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )

        return output.getvalue()

    async def export_reflections_json(
        self,
        db: AsyncSession,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> str:
        """Export reflections to JSON format"""
        # Query reflections with document data
        query = (
            select(Reflection)
            .join(Document)
            .where(Document.user_id == user_id)
            .options(selectinload(Reflection.document))
        )

        # Apply date filters if provided
        if start_date:
            query = query.where(
                Reflection.created_at
                >= datetime.combine(start_date, datetime.min.time())
            )
        if end_date:
            query = query.where(
                Reflection.created_at <= datetime.combine(end_date, datetime.max.time())
            )

        # Order by date descending
        query = query.order_by(Reflection.created_at.desc())

        # Execute query
        result = await db.execute(query)
        reflections = result.scalars().all()

        # Build JSON data
        data: dict[str, Any] = {
            "export_type": "reflections",
            "user_id": user_id,
            "export_date": datetime.utcnow().isoformat(),
            "data": [],
        }

        for reflection in reflections:
            data["data"].append(
                {
                    "document_id": str(reflection.document_id),
                    "document_title": reflection.document.title,
                    "reflection_content": reflection.content,
                    "quality_score": reflection.quality_score,
                    "word_count": len(reflection.content.split()),
                    "ai_level_granted": reflection.ai_level_granted,
                    "date": reflection.created_at.isoformat(),
                }
            )

        return json.dumps(data, indent=2)

    async def export_ai_interactions_csv(
        self,
        db: AsyncSession,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> str:
        """Export AI interactions to CSV format"""
        # Query AI interactions through reflection and document
        query = (
            select(AIInteraction)
            .join(Reflection)
            .join(Document)
            .where(Document.user_id == user_id)
            .options(
                selectinload(AIInteraction.reflection).selectinload(Reflection.document)
            )
        )

        # Apply date filters if provided
        if start_date:
            query = query.where(
                AIInteraction.created_at
                >= datetime.combine(start_date, datetime.min.time())
            )
        if end_date:
            query = query.where(
                AIInteraction.created_at
                <= datetime.combine(end_date, datetime.max.time())
            )

        # Order by date descending
        query = query.order_by(AIInteraction.created_at.desc())

        # Execute query
        result = await db.execute(query)
        interactions = result.scalars().all()

        # Create CSV output
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "Document Title",
                "User Question",
                "AI Response",
                "AI Level",
                "Date",
            ],
        )
        writer.writeheader()

        for interaction in interactions:
            writer.writerow(
                {
                    "Document Title": interaction.reflection.document.title,
                    "User Question": interaction.user_message,
                    "AI Response": interaction.ai_response,
                    "AI Level": interaction.ai_level,
                    "Date": interaction.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )

        return output.getvalue()

    async def export_writing_progress_csv(
        self,
        db: AsyncSession,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> str:
        """Export writing progress to CSV format"""
        # Query documents
        query = select(Document).where(Document.user_id == user_id)

        # Apply date filters if provided
        if start_date:
            query = query.where(
                Document.created_at >= datetime.combine(start_date, datetime.min.time())
            )
        if end_date:
            query = query.where(
                Document.created_at <= datetime.combine(end_date, datetime.max.time())
            )

        # Order by date
        query = query.order_by(Document.created_at)

        # Execute query
        result = await db.execute(query)
        documents = result.scalars().all()

        # Group by date
        daily_progress: dict[date, dict[str, int]] = {}
        for doc in documents:
            doc_date = doc.created_at.date()
            if doc_date not in daily_progress:
                daily_progress[doc_date] = {"documents": 0, "words": 0}
            daily_progress[doc_date]["documents"] += 1
            daily_progress[doc_date]["words"] += len(doc.content.split())

        # Create CSV output
        output = io.StringIO()
        writer = csv.DictWriter(
            output, fieldnames=["Date", "Documents Created", "Words Written"]
        )
        writer.writeheader()

        for progress_date, data in sorted(daily_progress.items()):
            writer.writerow(
                {
                    "Date": progress_date.isoformat(),
                    "Documents Created": data["documents"],
                    "Words Written": data["words"],
                }
            )

        return output.getvalue()

    async def export_reflections_pdf(
        self,
        db: AsyncSession,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> bytes:
        """Export reflections to PDF format"""
        # Query reflections with document data
        query = (
            select(Reflection)
            .join(Document)
            .where(Document.user_id == user_id)
            .options(selectinload(Reflection.document))
        )

        # Apply date filters if provided
        if start_date:
            query = query.where(
                Reflection.created_at
                >= datetime.combine(start_date, datetime.min.time())
            )
        if end_date:
            query = query.where(
                Reflection.created_at <= datetime.combine(end_date, datetime.max.time())
            )

        # Order by date descending
        query = query.order_by(Reflection.created_at.desc())

        # Execute query
        result = await db.execute(query)
        reflections = result.scalars().all()

        # Create PDF
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=letter,
            topMargin=inch,
            bottomMargin=inch,
            leftMargin=inch,
            rightMargin=inch,
        )

        # Container for the 'Flowable' objects
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=24,
            textColor=colors.HexColor("#1a1a1a"),
            spaceAfter=30,
            alignment=1,  # Center
        )
        elements.append(Paragraph("Reflection Export Report", title_style))
        elements.append(Spacer(1, 0.5 * inch))

        # Report metadata
        info_style = ParagraphStyle(
            "InfoStyle",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#666666"),
        )
        elements.append(
            Paragraph(
                f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", info_style
            )
        )
        elements.append(Paragraph(f"Total Reflections: {len(reflections)}", info_style))
        elements.append(Spacer(1, 0.5 * inch))

        # Add reflections
        for i, reflection in enumerate(reflections):
            # Document title
            doc_title_style = ParagraphStyle(
                "DocTitle",
                parent=styles["Heading2"],
                fontSize=16,
                textColor=colors.HexColor("#333333"),
                spaceAfter=10,
            )
            elements.append(
                Paragraph(f"Document: {reflection.document.title}", doc_title_style)
            )

            # Reflection metadata table
            metadata = [
                ["Date:", reflection.created_at.strftime("%Y-%m-%d %H:%M")],
                ["Quality Score:", f"{reflection.quality_score:.1f}"],
                ["Word Count:", str(len(reflection.content.split()))],
                ["AI Level:", reflection.ai_level_granted or "N/A"],
            ]

            metadata_table = Table(metadata, colWidths=[2 * inch, 4 * inch])
            metadata_table.setStyle(
                TableStyle(
                    [
                        ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
                        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#666666")),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )
            elements.append(metadata_table)
            elements.append(Spacer(1, 0.2 * inch))

            # Reflection content
            content_style = ParagraphStyle(
                "ContentStyle",
                parent=styles["Normal"],
                fontSize=11,
                leading=14,
                textColor=colors.HexColor("#1a1a1a"),
            )
            elements.append(Paragraph("Reflection Content:", styles["Heading3"]))
            elements.append(Spacer(1, 0.1 * inch))
            elements.append(Paragraph(reflection.content, content_style))

            # Add page break except for last reflection
            if i < len(reflections) - 1:
                elements.append(PageBreak())
            else:
                elements.append(Spacer(1, 0.5 * inch))

        # Build PDF
        doc.build(elements)

        # Get PDF bytes
        pdf_buffer.seek(0)
        return pdf_buffer.read()
