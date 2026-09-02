# AI 3D Studio

Selainpohjainen parametrinen 3D-suunnittelutyökalu, jossa ChatGPTissa tehty suunnitelma voidaan tuoda sovellukseen, tarkistaa 3D-näkymässä, muuttaa mittoja ja viedä STL-tiedostoksi sliceria varten.

## Nykyinen työnkulku

1. Suunnitelma tehdään tai päivitetään ChatGPTissa.
2. `chatgpt_plan.json` luetaan **Suunnitelmat**-listaan.
3. Suunnitelmasta tehdään oma muokattava projektikopio.
4. Mittoja muutetaan selaimessa ja projekti tallentuu paikallisesti.
5. Malli generoidaan ja mesh tarkistetaan.
6. STL avataan ElegooSlicerissa, Orcassa tai Curassa.
7. Slicerissa tarkistetaan orientaatio, tuet, ensimmäinen kerros ja lopullinen tulostusalue ennen tulostusta.

## Tuetut muokattavat osatyypit

- piikkimutterinsuojus
- holkki / soviterengas
- suorakaideputken päätytulppa
- levy / kiinnikeaihio
- mukautetuilla rei'illä varustettu kiinnikelevy
- pyöreä adapteri / supistus, jossa alku- ja loppupään sisä- ja ulkohalkaisijat voidaan määrittää erikseen
- avoin suorakulmainen kotelo, jossa leveys, pituus, korkeus, seinämä ja pohjan paksuus ovat muokattavia
- LED-valokyltti

ChatGPT-suunnitelmien Schema v1 sekä Schema v2:n `sleeve`, `spike`, `endPlug`, `mountingPlate`, `adapter` ja `enclosure` voidaan tuoda muokattaviksi projekteiksi. Tunnistettu mutta vielä tukematon osatyyppi näytetään suunnitelmalistassa selvästi eikä sitä yritetä avata väärällä editorilla.

## Projektien tallennus

Projektit tallennetaan selaimen `localStorage`-muistiin. Sovellus siirtää vanhan v1/v2 projektivaraston v3-muotoon ensimmäisellä käynnistyksellä, jos uutta varastoa ei vielä ole.

Projektista voi ladata erillisen `.ai3d.json`-varmuuskopion ja tuoda sen takaisin sovellukseen. Tuonnissa tarkistetaan tiedostokoko, projektirakenne ja tuettu osatyyppi ennen avaamista.

Projektityökaluihin kuuluu myös aktiivisen projektin kopiointi ja paikallinen poistaminen. Poisto koskee vain kyseisen selaimen projektikopiota eikä poista `chatgpt_plan.json`-suunnitelmaa tai GitHub-tiedostoja. Käyttöliittymä näyttää lisäksi paikallisten projektien määrän ja niiden likimääräisen tallennuskoon.

## CAD- ja STL-tarkistus

Ennen STL-latauksen sallimista sovellus tarkistaa mallin geometriasta vähintään:

- mittojen kelvollisuuden mallia generoitaessa
- nollapinta-alaiset kolmiot
- avoimet tai moninkertaiset mesh-reunat
- että jokainen mesh-reuna kuuluu suljetussa manifold-mallissa kahdelle kolmiolle

Adapteri generoidaan suljettuna onttona kartiomaisena holkkina. Avoin kotelo generoidaan yhtenä suljettuna mesh-kuorena, jossa sisäpohja ja seinät ovat osa samaa mallia.

Piikkimutterinsuojuksessa voidaan tehdä erillinen sovitustesti ennen koko osan tulostamista. Sovitusarvot ovat lähtöarvoja: todellinen sopivuus riippuu mutterin mitasta, tulostimen kalibroinnista, materiaalista ja kutistumisesta.

## Elegoo Centauri Carbon 2 Combo

Sovelluksessa on erillinen Centauri-tarkistus. Profiilin tulostusalue on **256 × 256 × 256 mm**, suutin **0,4 mm** ja filamentin halkaisija **1,75 mm**. 3D Studio varoittaa, jos malli ylittää tulostusalueen tai on hyvin lähellä sen rajaa.

Sovelluksen Centauri-painike lataa edelleen STL-tiedoston selaimesta. Se ei käynnistä tulostinta eikä ohita sliceria. Lopullinen viipalointi ja tulostuksen hyväksyntä tehdään slicerissa.

## Materiaalit

Käyttöliittymässä on tällä hetkellä lähtöprofiilit PLA:lle, PETG:lle ja ASA:lle. Ne ovat suunnittelun lähtökohtia, eivät korvaa filamentin valmistajan tai slicerin materiaaliprofiilia.

## Turvallisuus

AI 3D Studio ei lähetä tulostuskomentoja suoraan tulostimelle. Fyysinen tulostus tehdään erillisessä slicer-/tulostintyönkulussa käyttäjän hyväksynnällä.

Ajoneuvoon tai muuhun turvallisuuskriittiseen käyttöön tuleva osa on aina sovitus-, lujuus- ja kiinnitystestattava ennen käyttöä. Tulostettava malli ei ole automaattisesti mekaanisesti turvallinen vain siksi, että mesh-validointi läpäisee.

## Kehityssuunta

- moniosaiset projektit ja osakohtainen muokkaus
- parempi 3D-esikatselun mitta- ja leikkausnäkymä
- tulostettavuuden analyysi: seinämäpaksuudet, ylitykset ja tukitarve
- lisää Schema v2 -operaatioita turvallisesti muokattaviksi
- 3MF-vienti, kun se voidaan toteuttaa ilman että nykyinen STL-työnkulku rikkoutuu
