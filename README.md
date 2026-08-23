# AI 3D Studio

Selainpohjainen prototyyppi parametriseen 3D-suunnitteluun. Ensimmäinen malli on kuorma-auton 33 mm pyöränmutterille tarkoitettu piikkimutterinsuojus.

## v0.2

- parametriset mitat
- 3D-esikatselu ilman ulkoisia kirjastoja
- ASCII STL -generointi suoraan selaimessa
- erillinen 8 mm korkea sovitustesti-STL ennen kokonaisen piikin tulostamista
- automaattinen mesh-tarkistus ennen STL-latauksen sallimista
- suljetun manifold-geometrian reunatarkistus
- STL-lataus OrcaSliceriin / ElegooSliceriin
- mobiili- ja työpöytänäkymä
- ASA/PETG-käyttöön tarkoitettu suunnittelupohja

## Käyttö

Avaa GitHub Pages -versio tai `index.html` selaimessa. Syötä mitat ja paina **LUO JA TARKISTA MALLI**.

Suositeltu eteneminen:

1. Lataa **SOVITUSTESTI STL**.
2. Tulosta vain tämä 8 mm korkea testirengas.
3. Kokeile se oikeaan mutteriin.
4. Jos se on liian tiukka tai löysä, säädä välystä 0,05–0,15 mm kerrallaan.
5. Kun sovitus on hyvä, lataa ja tulosta koko STL.

## 33 mm tarkoittaa avainkokoa

Tulostettavan suojan sisämuoto on kuusikulmio. Oletuksena sisäpuolen vastakkaisten sivujen väli on 33,50 mm (33 mm mutteri + 0,25 mm välys kummallekin puolelle). Tämä on lähtöarvo, ei lopullinen varmistettu sovitus.

Todellinen sopivuus riippuu mutterin mitoista, tulostimen kalibroinnista, materiaalin kutistumisesta ja käyttölämpötilasta.

## v0.2 tekninen tarkistus

Ennen STL-latauksen sallimista sovellus tarkistaa, että:

- kaikki koordinaatit ovat kelvollisia lukuja
- meshissä ei ole nollapinta-alaisia kolmioita
- jokainen mesh-reuna kuuluu täsmälleen kahdelle kolmio-pinnalle
- sekä kokonainen piikki että sovitustesti muodostavat suljetun manifold-meshin

Oletusmitoilla kokonaisen mallin sisä-AF on 33,50 mm, ulko-AF 38,50 mm ja kokonaiskorkeus 75,0 mm.

## Turvallisuus

Tämä prototyyppi ei lähetä mitään suoraan 3D-tulostimelle. Tulevassa tulostinyhteydessä fyysisen tulostuksen käynnistys vaatii aina käyttäjän hyväksynnän.

Ajoneuvon ulkopuolelle asennettavan osan kiinnitys on varmistettava niin, ettei osa voi irrota liikenteessä. Prototyyppiä ei pidä asentaa liikennekäyttöön ennen sopivuus- ja kiinnitystestausta.

## Seuraavat vaiheet

1. Koekappaleen sovituksen kalibrointi oikealla 33 mm mutterilla.
2. Parempi mekaaninen lukitusgeometria.
3. 3MF-vienti ja tulostusprofiilit.
4. Orca/ElegooSlicer-integraatio.
5. Centauri Carbon 2 -LAN-yhteys ja tulostimen tilan näyttö.
6. AI-ohjattu parametrien muodostus luonnollisesta kielestä.
