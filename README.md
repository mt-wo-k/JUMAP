# JUMAP

都道府県を選び、市区町村と政令指定都市の行政区に数値を入力して色分けする、個人利用向けのWebアプリです。

## 開発

`npm install` の後に `npm run dev` で開発サーバーを起動します。自動テストは `npm test` で実行します。

GitHub に push して Vercel のプロジェクトに接続すると、静的フロントエンドとしてデプロイできます。API キーやサーバー環境変数は不要です。

## 使い方

1. マップ名、対象都道府県、単位、最大値の色を指定してマップを作成します。
2. 地図上の市区町村・行政区を選択し、数値とメモを保存します。
3. 入力済みの数値の最小値は地図背景色、最大値は設定色になり、その間はRGBで補間します。
4. 値が未入力の地域は背景色で表示します。入力がすべて同じ値の場合は最大値の色で表示します。

マップと入力内容は現在のブラウザーの localStorage に保存されます。別ブラウザーや別端末には同期されません。

## 境界データ

`public/data/municipalities/<都道府県コード>/municipalities.topojson` に、選択された都道府県のTopoJSONを置いています。地図を開く際に選択地域だけ取得し、ブラウザー上でGeoJSONに変換します。

元データは [kyodo-official/japan-choropleth](https://github.com/kyodo-official/japan-choropleth) の都道府県別市区町村TopoJSONです。共同通信社が国土交通省 国土数値情報「行政区域データ」2025年版を加工したデータを使用しています。行政区域データは CC BY 4.0 で提供されており、このアプリでは出典を画面内と本READMEに表示しています。境界データは共同通信社のコードと別ライセンスです。

- 出典: 共同通信社「japan-choropleth」
- 原典: 国土交通省 国土数値情報「行政区域データ」（2025年版）
- ライセンス: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- [データとコードのライセンス説明](https://github.com/kyodo-official/japan-choropleth#ライセンス)

## 技術構成

- React 19 + TypeScript + Vite
- React Leaflet / Leaflet（背景タイルなし、ポリゴンのみ）
- TopoJSON（選択都道府県ごとに遅延取得）
- localStorage（バージョン付きキー。将来の同期実装と分離できる保存モジュール）

## 今後の同期について

スマートフォンとPC間の同期には、クラウド保存が必要です。ログインなしで公開アプリに保存機能を足すと、第三者による閲覧・変更を防げません。同期を実装する段階で、認証、端末間で共有する秘密鍵、またはエクスポート／インポート方式のいずれかを決めてください。
