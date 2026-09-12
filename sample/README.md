# サンプル画像の出典とライセンス

このフォルダの5枚は、Hugging Face の
[`imageomics/rare-species`](https://huggingface.co/datasets/imageomics/rare-species)
データセットに収録されている作品です。データセット付属の画像別ライセンス台帳
（`metadata/licenses.csv`）で、各画像が `cc-publicdomain` / CC0 1.0 と記載されていることを
2026-09-12に確認し、同台帳に記載された原典（Wikimedia Commons）から取得しました。

CC0 1.0では、著作権者が可能な限り著作権等を放棄しており、個人利用・改変・再配布が
許可されています。クレジット表記は必須ではありませんが、来歴を追跡できるよう以下に
記録します。CC0は商標・特許・肖像権など、第三者の権利まで保証するものではありません。

ライセンス全文: https://creativecommons.org/publicdomain/zero/1.0/legalcode.en

| ファイル | 元画像タイトル | 権利者・提供者（台帳記載） | データセット画像ID | 取得元URL |
|---|---|---|---|---|
| `gecko.jpg` | Phelsuma standingi 191909081.jpg | Marius Burger | `3387dc4a-4061-4151-ae68-b2fd9bf12d26` | https://upload.wikimedia.org/wikipedia/commons/c/c4/Phelsuma_standingi_191909081.jpg |
| `sturgeon.jpg` | Pallid sturgeon - Garrison Dam ND.jpg | U.S. Fish and Wildlife Service | `92da1502-8952-4c25-b20c-a9e7108e4e09` | https://upload.wikimedia.org/wikipedia/commons/e/ea/Pallid_sturgeon_-_Garrison_Dam_ND.jpg |
| `bear.jpg` | Tremarctos ornatus Zoo Rio04.jpg | Alberto Apollaro Teleuko | `516c8b78-d22b-41a5-a134-92111273a049` | https://upload.wikimedia.org/wikipedia/commons/9/97/Tremarctos_ornatus_Zoo_Rio04.jpg |
| `hamster.jpg` | Muffin (Hamster) 1.JPG | Tb240904 | `dfe7d711-94d8-47f7-80c1-a3d76644502e` | https://upload.wikimedia.org/wikipedia/commons/f/f3/Muffin_%28Hamster%29_1.JPG |
| `crocodile.jpg` | CubanCrocodile 001.jpg | Ltshears | `e9039515-0c78-4b92-aa60-317a1219d344` | https://upload.wikimedia.org/wikipedia/commons/8/8f/CubanCrocodile_001.jpg |

## ファイル照合用MD5

今回取得したファイルの値です（原典ファイルは、データセット内で変換されたコピーと
ハッシュが異なる場合があります）。

```text
18c1f4ae7532886e20f498f699edf39f  gecko.jpg
c5cc10869a18276b9056ff5020896348  sturgeon.jpg
3177ea98de0adc7e9a85b3d0d8641805  bear.jpg
e38920c610db1b5cdbb512e5f486cba0  hamster.jpg
9f0027fc206012a9adca4c6642abc035  crocodile.jpg
```

注意: Hugging Face上のデータセット「全体」はCC0と表示されていますが、収録画像には別の
ライセンスも含まれます。このフォルダでは全体表示だけを根拠にせず、画像別台帳でCC0と
確認できた5枚のみを選びました。
