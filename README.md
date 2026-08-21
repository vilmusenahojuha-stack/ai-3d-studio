# AI 3D Studio

Selainpohjainen prototyyppi parametriseen 3D-suunnitteluun. Ensimmäinen malli on kuorma-auton 33 mm pyöränmutterille tarkoitettu piikkimutterinsuojus.

## v0.1

- parametriset mitat
- 3D-esikatselu ilman ulkoisia kirjastoja
- ASCII STL -generointi suoraan selaimessa
- STL-lataus OrcaSliceriin / ElegooSliceriin
- mobiili- ja työpöytänäkymä
- ASA/PETG-käyttöön tarkoitettu suunnittelupohja

## Käyttö

Avaa `index.html` selaimessa tai julkaise repository GitHub Pagesissa. Syötä mitat, paina **LUO MALLI** ja lataa STL.

## 33 mm tarkoittaa avainkokoa

Tulostettavan suojan sisämuoto on kuusikulmio. Oletuksena sisäpuolen vastakkaisten sivujen väli on 33,50 mm (33 mm mutteri + 0,25 mm välys kummallekin puolelle). Tämä on lähtöarvo, ei lopullinen varmistettu sovitus.

Tulosta aina ensin yksi koekappale. Todellinen sopivuus riippuu mutterin mitoista, tulostimen kalibroinnista, materiaalin kutistumisesta ja käyttölämpötilasta.

## Turvallisuus

Tämä prototyyppi ei lähetä mitään suoraan 3D-tulostimelle. Tulevassa tulostinyhteydessä fyysisen tulostuksen käynnistys vaatii aina käyttäjän hyväksynnän.

Ajoneuvon ulkopuolelle asennettavan osan kiinnitys on varmistettava niin, ettei osa voi irrota liikenteessä. Prototyyppiä ei pidä asentaa liikennekäyttöön ennen sopivuus- ja kiinnitystestausta.

## Seuraavat vaiheet

1. Koekappaleen sovituksen kalibrointi.
2. Parempi lukitusgeometria 33 mm mutterille.
3. 3MF-vienti ja tulostusprofiilit.
4. Orca/ElegooSlicer-integraatio.
5. Centauri Carbon 2 -LAN-yhteys ja tulostimen tilan näyttö.
6. AI-ohjattu parametrien muodostus luonnollisesta kielestä.
