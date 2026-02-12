# Route pour générer un PDF de devis - À insérer dans server_supabase.py après delete_quote

@api_router.get("/quotes/{quote_id}/pdf")
async def generate_quote_pdf(
    quote_id: str,
    user_data: dict = Depends(get_user_from_token)
):
    """Générer un PDF professionnel pour un devis"""
    try:
        company_id = await get_user_company(user_data)
        if not company_id:
            raise HTTPException(status_code=400, detail="Vous devez appartenir à une entreprise")
        
        # Récupérer le devis
        response = supabase_service.table("quotes").select("*").eq("id", quote_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Devis introuvable")
        
        quote = response.data[0]
        
        # Récupérer les informations de l'entreprise
        company_info = {}
        company_response = supabase_service.table("companies").select("*").eq("id", company_id).execute()
        if company_response.data:
            company_info = company_response.data[0]
        
        # Créer le PDF
        buffer = io.BytesIO()
        
        def add_page_number(canvas, doc):
            """Ajoute le numéro de page dans le pied de page"""
            canvas.saveState()
            canvas.setFont('Helvetica', 8)
            canvas.setFillColor(colors.Color(0.5, 0.5, 0.5))
            page_num_text = f"Page {doc.page}"
            canvas.drawCentredString(A4[0]/2, 1.5*cm, page_num_text)
            canvas.restoreState()
        
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, 
                               leftMargin=2*cm, rightMargin=2*cm)
        
        story = []
        styles = getSampleStyleSheet()
        
        # Styles personnalisés
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'],
                                     fontSize=24, textColor=colors.HexColor("#1f2937"),
                                     spaceAfter=30, alignment=TA_CENTER, fontName='Helvetica-Bold')
        
        subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
                                       fontSize=12, textColor=colors.HexColor("#6b7280"),
                                       alignment=TA_CENTER, spaceAfter=20)
        
        header_style = ParagraphStyle('Header', parent=styles['Heading2'],
                                     fontSize=14, textColor=colors.HexColor("#374151"),
                                     fontName='Helvetica-Bold', spaceAfter=12)
        
        normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'],
                                     fontSize=10, textColor=colors.HexColor("#1f2937"))
        
        # ==== EN-TÊTE ====
        story.append(Spacer(1, 1*cm))
        
        # Logo ou nom entreprise
        if company_info.get('name'):
            company_name = Paragraph(f"<b>{company_info['name']}</b>", 
                                    ParagraphStyle('CompanyName', fontSize=18, textColor=colors.HexColor("#6366f1")))
            story.append(company_name)
            story.append(Spacer(1, 0.3*cm))
        
        # Titre DEVIS
        story.append(Paragraph("DEVIS", title_style))
        
        # Numéro de devis
        if quote.get('quote_number'):
            quote_num = Paragraph(f"N° {quote['quote_number']}", subtitle_style)
            story.append(quote_num)
        
        story.append(Spacer(1, 1*cm))
        
        # ==== INFORMATIONS CLIENT ET ENTREPRISE ====
        info_data = []
        
        # Colonne entreprise
        company_text = []
        if company_info.get('name'):
            company_text.append(f"<b>{company_info['name']}</b>")
        if company_info.get('legal_form'):
            company_text.append(company_info['legal_form'])
        if company_info.get('address'):
            company_text.append(company_info['address'])
        if company_info.get('siret'):
            company_text.append(f"SIRET: {company_info['siret']}")
        
        # Colonne client
        client_text = []
        client_text.append("<b>CLIENT</b>")
        if quote.get('client_name'):
            client_text.append(quote['client_name'])
        
        info_data.append([
            Paragraph("<br/>".join(company_text), normal_style),
            Paragraph("<br/>".join(client_text), normal_style)
        ])
        
        info_table = Table(info_data, colWidths=[9*cm, 8*cm])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 1*cm))
        
        # ==== INFORMATIONS GÉNÉRALES ====
        if quote.get('title') or quote.get('description'):
            story.append(Paragraph("Description", header_style))
            if quote.get('title'):
                story.append(Paragraph(f"<b>{quote['title']}</b>", normal_style))
                story.append(Spacer(1, 0.2*cm))
            if quote.get('description'):
                story.append(Paragraph(quote['description'], normal_style))
            story.append(Spacer(1, 0.8*cm))
        
        # ==== DÉTAIL DES PRESTATIONS ====
        story.append(Paragraph("Détail des prestations", header_style))
        
        items = quote.get('items', [])
        if items:
            # En-têtes du tableau
            items_data = [[
                Paragraph("<b>Désignation</b>", normal_style),
                Paragraph("<b>Qté</b>", normal_style),
                Paragraph("<b>Prix HT</b>", normal_style),
                Paragraph("<b>TVA</b>", normal_style),
                Paragraph("<b>Total HT</b>", normal_style)
            ]]
            
            total_ht = 0
            total_tva = 0
            
            for item in items:
                qty = float(item.get('quantity', 0))
                price = float(item.get('price', 0))
                tva_rate = float(item.get('tva_rate', 20))
                
                item_total = qty * price
                item_tva = item_total * (tva_rate / 100)
                
                total_ht += item_total
                total_tva += item_tva
                
                # Description avec nom et description
                desc_parts = []
                if item.get('name'):
                    desc_parts.append(f"<b>{item['name']}</b>")
                if item.get('description'):
                    desc_parts.append(item['description'])
                
                designation = Paragraph("<br/>".join(desc_parts), normal_style)
                
                items_data.append([
                    designation,
                    Paragraph(str(qty), normal_style),
                    Paragraph(f"{price:.2f}€", normal_style),
                    Paragraph(f"{tva_rate}%", normal_style),
                    Paragraph(f"{item_total:.2f}€", normal_style)
                ])
            
            items_table = Table(items_data, colWidths=[8*cm, 2*cm, 2.5*cm, 2*cm, 2.5*cm])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#374151")),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(items_table)
            story.append(Spacer(1, 0.5*cm))
            
            # ==== TOTAUX ====
            total_ttc = total_ht + total_tva
            
            totals_data = [
                ['Total HT', f"{total_ht:.2f}€"],
                ['Total TVA', f"{total_tva:.2f}€"],
                ['', ''],
                ['TOTAL TTC', f"{total_ttc:.2f}€"]
            ]
            
            totals_table = Table(totals_data, colWidths=[14*cm, 3*cm])
            totals_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 3), (1, 3), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 3), (1, 3), 12),
                ('TEXTCOLOR', (0, 3), (1, 3), colors.HexColor("#6366f1")),
                ('LINEABOVE', (0, 3), (-1, 3), 2, colors.HexColor("#6366f1")),
                ('TOPPADDING', (0, 3), (-1, 3), 8),
            ]))
            
            story.append(totals_table)
        
        story.append(Spacer(1, 2*cm))
        
        # ==== PIED DE PAGE ====
        footer_text = []
        footer_text.append(f"<b>Date d'émission:</b> {datetime.now().strftime('%d/%m/%Y')}")
        if quote.get('status') == 'SENT':
            footer_text.append("<b>Statut:</b> Envoyé")
        elif quote.get('status') == 'DRAFT':
            footer_text.append("<b>Statut:</b> Brouillon")
        
        footer = Paragraph("<br/>".join(footer_text), 
                          ParagraphStyle('Footer', fontSize=8, textColor=colors.HexColor("#6b7280")))
        story.append(footer)
        
        # Construire le PDF
        doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
        
        buffer.seek(0)
        
        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Devis_{quote.get('quote_number', quote_id)}.pdf"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Erreur génération PDF devis: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du PDF: {str(e)}")
