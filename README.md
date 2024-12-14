<img width="250" src="https://github.com/user-attachments/assets/307c147b-a307-4c0d-b60a-d95d9b8b7045" />


**Create flyers and posters dynamically!**


## Usage

## How works

1. Toma las variables que pasó el user y las guarda como `user$$nombreVariable`
2. Guarda las fuentes en una propiedad de la clase
3. Crea las instancias del parser y el builder del parseador de XML
4. Al llamar a `svgsFrom`, establece la ruta del diseño
5. Establece la ruta del manifest.json y el templatesDir/
6. Lee el manifest.json y extrae assets, `metadata` y `variables`
7. `template$$nombreVariable` para variables del template
8. `metadata$$nombreVariable` para los valores de metadata