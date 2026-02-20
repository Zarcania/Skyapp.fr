import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

msg = MIMEMultipart("alternative")
msg["Subject"] = "SkyApp - Test delivrabilite"
msg["From"] = "SkyApp <contact@skyapp.fr>"
msg["To"] = "lepeltierca@hotmail.fr"
# Headers anti-spam
msg["Reply-To"] = "contact@skyapp.fr"
msg["List-Unsubscribe"] = "<mailto:contact@skyapp.fr?subject=unsubscribe>"

html = """<html><body>
<div style="font-family:Arial,sans-serif;padding:20px;">
<h2>Test de delivrabilite SkyApp</h2>
<p>Si cet email est dans votre boite de reception (pas les spams), tout est bon !</p>
<p>Cordialement,<br>L'equipe SkyApp</p>
</div>
</body></html>"""

text = "Test de delivrabilite SkyApp. Si cet email est dans votre boite de reception, tout est bon !"

msg.attach(MIMEText(text, "plain", "utf-8"))
msg.attach(MIMEText(html, "html", "utf-8"))

server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
server.starttls()
server.login("contact@skyapp.fr", "osoexqknjouexcbt")
server.sendmail("contact@skyapp.fr", "lepeltierca@hotmail.fr", msg.as_string())
server.quit()
print("Email de test envoye avec succes !")
