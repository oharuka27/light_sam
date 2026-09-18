# light_sam

ポートフォリオサイトに組み込む予定の、軽量SAM(MobileSAM相当)を使った物体切り出し・クイズアプリ。

画像を読み込み、クリックした場所周辺のオブジェクトをSAMで切り出し、それが何かをCLIPのゼロショット分類で推定して「3択+それ以外」のクイズ形式で当ててもらう、というミニアプリ。PC・スマホどちらのブラウザからも動作する。

## 概要

- 画像読込 → クリックで対象を指定 → セグメンテーション → 切り出し領域の分類 → クイズ表示、という一連の流れをすべてブラウザ内で完結させる
- 画像は当面メモリ上でのみ管理し、別の画像を読み込んだ場合やアプリを終了した場合は破棄してよい(要件通り)
- 将来的にCloudflare R2(画像保存)・D1(回答ログ)へ拡張する構想があるため、設計上はその差し込み口を意識している

## 設計方針

開発着手前にホワイトボード形式で検討し、以下の4点を決定した。

1. **推論はすべてクライアントサイド(ブラウザ内)で実行する**
   ホスティングをCloudflare Pages/Workersで完結させたいため、常駐のGPU/Pythonサーバーを持たない前提。ブラウザ内推論ならサーバーコストゼロで済む。
2. **クイズの4択(3候補+それ以外)は軽量画像分類モデルで自動推定する**
   SAM自体は形状を切り出すだけで中身が何かは判定しないため、CLIPのゼロショット分類で運転シーン語彙と照合し、スコア上位3件を選択肢にする。
3. **ホスティングはCloudflare Pages/Workersで完結させる**
   将来のR2/D1拡張と親和性が高く、静的配信+Functionsだけでインフラが完結する。
4. **モデル調達は「既存の変換済みONNXモデルを利用する」方針(自前エクスポートはしない)**
   実装速度を優先し、Hugging Face(Xenova)が公開済みの変換済みSlimSAM/CLIPをtransformers.js経由でそのまま使う。将来、精度やサイズがボトルネックになった箇所だけ自前エクスポート・量子化に置き換えるハイブリッド戦略とする。

画像の保持については、当面はメモリ上のみとし、R2/D1への永続化は将来の拡張ポイントとして状態管理を分離した設計にしている(現時点では未実装)。

## 設計(アーキテクチャ)

```
┌──────────────────────────────────────────────────────────────────┐
│                  Cloudflare Pages(静的配信 / SPA)                   │
│              React + TypeScript (Vite build)                       │
│                                                                      │
│  ┌───────────────┐    ┌───────────────────┐   ┌──────────────────┐│
│  │  UIスレッド     │    │  Web Worker #1      │   │  Web Worker #2    ││
│  │ - 画像読込      │    │  SAM推論            │   │  分類推論(CLIP)   ││
│  │ - Canvas描画    │◄──►│  encoder→embedding  │   │  image/text       ││
│  │ - クリック検知  │    │  decoder→mask       │   │  encoder          ││
│  │ - クイズUI      │    │  onnxruntime-web    │   │  onnxruntime-web  ││
│  │               │    │  (WebGPU→WASM fallback)│  │(WebGPU→WASM)    ││
│  └───────────────┘    └───────────────────┘   └──────────────────┘│
│         状態はすべてメモリ内(画像/embedding/マスク/クロップ)          │
└──────────────────────────────────────────────────────────────────┘
                 │ 初回アクセス時のみモデルファイル取得(以後キャッシュ)
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  モデル配信: 非公開Cloudflare R2 → Workerの /models/* 経由           │
│  - SAM: Xenova/slimsam-77-uniform (vision_encoder / mask_decoder)   │
│  - CLIP: Xenova/clip-vit-base-patch32 (zero-shot-image-classification)│
│  いずれもdtype=q8(int8量子化)でロードしダウンロード量を抑える        │
└──────────────────────────────────────────────────────────────────┘

【将来拡張(未実装・設計だけ留意)】
┌────────────────────┐   ┌──────────────┐   ┌───────────────┐
│ Worker API           │──▶│ D1 (回答ログ) │   │ R2 (画像/クロップ)│
└────────────────────┘   └──────────────┘   └───────────────┘
```

### データフロー

1. 画像読込(ファイル選択、モバイルは`capture="environment"`でカメラ撮影も可)→ 表示用と推論用に2つの`ImageBitmap`を作成
2. 画像ロード時に一度だけSAM encoderを実行しimage embeddingをWorker内にキャッシュ(最も重い処理)
3. ユーザーがCanvasをクリック → クリック座標をSAM decoderに渡し高速(数十ms)にマスクを生成、`iou_scores`が最も高いチャンネルを採用
4. マスクからbounding boxを算出し、UI側でオリジナル画像から該当領域を(余白15%を付けて)クロップ
   → SAMのマスクで背景を透過/黒塗りするとCLIPの認識精度が落ちやすいため、あえてマスクそのままでなくbounding box cropを使っている
5. クロップ画像をCLIPのzero-shot-image-classificationにかけ、運転シーン語彙([src/data/vocabulary.ts](src/data/vocabulary.ts))とのスコアを計算 → 上位3ラベル+「それ以外」をシャッフルしてクイズの選択肢にする
6. ユーザーが選択 → その場でAIの一番の予測との一致/不一致をフィードバック表示するのみ。永続化はしない
7. 次の画像読込・別の点のクリック・アプリ終了で状態はすべて破棄される

### 難しい部分として認識している点

- モバイルブラウザのWebGPU対応がまちまち(iOS Safariはまだ狭い、Android Chromeも端末依存)なため、WASMフォールバックが必須。フォールバック時はSAM encoderが数秒〜十数秒かかりうる
- SAM+CLIP合計で100MB超になりがちなモデルサイズ。量子化(dtype=q8)とブラウザキャッシュで緩和しているが、モバイル回線での初回体験は引き続き課題
- マスク後クロップでのCLIP精度不安定(→ bounding box cropで一部緩和)
- 「3択」の語彙設計次第でクイズの妥当性が大きく変わる(→ 運転シーン特化の固定語彙をキュレーション)

### 最もリスクの高い判断とその比較

**論点: ブラウザ内モデル調達・実行基盤をどう作るか**

| | Approach A(採用): 既存の変換済みモデルを利用 | Approach B: 自前でONNXエクスポート・量子化 |
|---|---|---|
| 実装速度 | 速い(transformers.js経由でそのまま使える) | 遅い(エクスポート・量子化・動作検証が必要) |
| 精度/サイズの調整余地 | 少ない(公開済みバリアントに限定) | 大きい(用途特化のチューニングが可能) |
| リスク | 依存先の更新停止 | dynamic shape非対応・opset未対応演算などにハマりやすい |

MVPはApproach Aで構築し、精度やサイズが実際にボトルネックになった箇所だけApproach Bで置き換える方針とした。

## 実装内容

### 技術スタック

- Vite + React 19 + TypeScript
- [`@huggingface/transformers`](https://www.npmjs.com/package/@huggingface/transformers)(transformers.js。内部でonnxruntime-webを使用)
- 使用モデル
  - `Xenova/slimsam-77-uniform`(SAM。mask-generationタスク、dtype: `q8`)
  - `Xenova/clip-vit-base-patch32`(CLIP。zero-shot-image-classificationタスク、dtype: `q8`)

### ディレクトリ構成

```
src/
  App.tsx                 画面全体の状態遷移(画像読込→エンコード→クリック→デコード→分類→クイズ)を管理
  types.ts                共有の型定義(Point / MaskResult / ClassificationResult など)
  data/
    vocabulary.ts          CLIPゼロショット分類の候補ラベル(運転シーン語彙、日英対応)
  lib/
    device.ts               WebGPU利用可否を判定(失敗時はWASMにフォールバック)
    workerRpc.ts             Web WorkerとのPromiseベースRPCヘルパー
    samClient.ts             SAM Workerのラッパー(loadModel / setImage / decodePoint)
    clipClient.ts            CLIP Workerのラッパー(loadModel / classify)
    quiz.ts                  CLIPの分類結果を日本語ラベルに変換し、上位3件+「それ以外」の選択肢を組み立てる
  workers/
    samWorker.ts             SAMのロード・画像embedding計算・クリック点からのマスクデコードを実行
    clipWorker.ts             CLIPのロード・クロップ画像のゼロショット分類を実行
  components/
    ImageUploader.tsx         画像選択/カメラ撮影ボタン
    CanvasStage.tsx           画像描画・マスクオーバーレイ描画・クリック座標の取得
    QuizPanel.tsx             4択クイズUIとAIの予測とのフィードバック表示
    LoadingOverlay.tsx        モデルダウンロード進捗表示
```

### 実装済みの挙動

- SAMの画像embeddingは画像読込時に一度だけ計算し、クリックごとの再計算はしない(interactive decodeパターン)
- マスクは`iou_scores`最大のチャンネルを自動選択
- クロップは検出bboxに15%のパディングを加えた範囲
- WebGPUが使える環境では自動的にWebGPUを使用し、失敗時はWASMに自動フォールバック(SAM/CLIP双方)
- 画像はReactのref(`ImageBitmap`)としてのみ保持し、新しい画像読込時や離脱時に明示的に`close()`して解放

### テスト(Vitest)

ONNX推論やCanvas/OffscreenCanvasに依存しない、決定的なロジックをユニットテストの対象にしている。

- `src/lib/quiz.test.ts` — CLIP分類結果→クイズ選択肢への変換(語彙マッチング、top3抽出、「それ以外」の付与、未知ラベルの無視)
- `src/lib/device.test.ts` — WebGPU検出とWASMへのフォールバック(`navigator.gpu`の有無・`requestAdapter`の成功/null/例外の各パターン)
- `src/lib/workerRpc.test.ts` — Web WorkerとのRPC層(`WorkerClient`のcall解決/reject/イベント配送、`createRpcServer`のハンドラ呼び出し・未知type・例外時のエラー応答)

Workerそのもの(`samWorker.ts`/`clipWorker.ts`)やCanvas描画・React UIは、実モデルのダウンロードやOffscreenCanvasを要するためユニットテストの対象外とし、手動でのブラウザ動作確認に委ねている。

## Cloudflare Workers / R2へのデプロイ

AIモデルはWorkers Static Assetsの1ファイル上限を超えるため、`light-sam-models` R2バケットに保存する。
バケットは公開せず、Workerが同一オリジンの`/models/*`として読み出す。CORS設定やR2カスタムドメインは不要。

初回のみ、アプリをデプロイする前にCloudflare DashboardのR2画面で次のバケットを作成する。

```text
light-sam-models
```

続いてローカル環境からモデルを取得し、R2へアップロードする。

```bash
npx wrangler login
npm run models:download
npm run models:upload
```

`.models/`には約170MB以上のファイルが保存されるが、Git管理対象外。`models:upload`は
`wrangler r2 object put --remote`を使い、モデルと設定ファイルを非公開R2へアップロードする。

R2へのアップロード後、通常どおりデプロイする。

```bash
npm run deploy
```

CloudflareのGit連携を利用する場合も、先にR2バケット作成とモデルアップロードを完了させてから変更をpushする。
`wrangler.jsonc`の`MODELS`バインディングはデプロイ時に自動設定されるため、DashboardでWorkerのバインディングを手動追加する必要はない。

### 未実装・今後のTODO

- 複数点クリックによるマスクの精緻化(現状はシングルクリックのみ)
- Cloudflare D1への回答ログ保存・R2への画像永続化(要件上、将来拡張として計画中)
- Worker本体・UIコンポーネントのテスト(モデルダウンロードが絡むため現状は手動確認のみ)

## 開発方法

```bash
npm install
npm run dev        # 開発サーバー起動
npm run build      # 型チェック + 本番ビルド
npm run lint       # oxlintによる静的解析
npm run test       # Vitestでユニットテストを実行
npm run test:watch # Vitestをwatchモードで実行
npm run models:download # Hugging Faceから必要なモデルを.models/へ取得
npm run models:upload   # .models/のモデルをCloudflare R2へアップロード
```

初回起動時、ブラウザがCloudflare R2から合計100〜200MB程度のモデルファイルをダウンロードするため、初回のみ読み込みに時間がかかる(2回目以降はブラウザキャッシュから読み込まれる)。

---

このREADMEは開発の節目ごとに更新する。大きな機能追加・設計変更を行った際は、対応するセクション(設計方針/設計/実装内容)を書き換えること。
