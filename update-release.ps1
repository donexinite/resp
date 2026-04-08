$node    = 'C:\Program Files\nodejs\node.exe'
$asar    = 'C:\Users\pc\Downloads\RespGPT\node_modules\@electron\asar\bin\asar.mjs'
$src     = 'C:\Users\pc\Downloads\RespGPT'
$staging = 'C:\Users\pc\Downloads\RespGPT\_staging'
$asarOut = 'C:\Users\pc\Downloads\RespGPT\dist\win-unpacked\resources\app.asar'
$relApp  = 'C:\Users\pc\Downloads\RespGPT-Release\app'
$install = 'C:\Users\pc\AppData\Local\Programs\RespGPT'

Write-Host '[1/5] Building clean staging folder...'
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null
New-Item -ItemType Directory -Path "$staging\renderer" | Out-Null
New-Item -ItemType Directory -Path "$staging\assets"   | Out-Null

Copy-Item "$src\main.js"                "$staging\main.js"                -Force
Copy-Item "$src\preload.js"             "$staging\preload.js"             -Force
Copy-Item "$src\package.json"           "$staging\package.json"           -Force
Copy-Item "$src\renderer\index.html"    "$staging\renderer\index.html"    -Force
Copy-Item "$src\renderer\style.css"     "$staging\renderer\style.css"     -Force
Copy-Item "$src\renderer\renderer.js"   "$staging\renderer\renderer.js"   -Force
Copy-Item "$src\assets\*"               "$staging\assets\" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host '[2/5] Packing fresh asar...'
& $node $asar pack $staging $asarOut

Write-Host '[3/5] Cleaning up staging...'
Remove-Item $staging -Recurse -Force

Write-Host '[4/5] Copying to release folder...'
if (-not (Test-Path $relApp)) { New-Item -ItemType Directory -Path $relApp -Force | Out-Null }
Copy-Item "$src\dist\win-unpacked\*" $relApp -Recurse -Force

Write-Host '[5/5] Updating installed app...'
if (Test-Path $install) {
    Copy-Item $asarOut "$install\resources\app.asar" -Force
    Write-Host '    Installed app updated.'
} else {
    Write-Host '    Not installed yet - skipping.'
}

Write-Host ''
Write-Host 'All done!'
