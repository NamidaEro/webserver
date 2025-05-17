const tempRealms = [
  { id: 'azshara', name: '아즈샤라' },
  { id: 'durotan', name: '듀로탄' },
  { id: 'guldan', name: '굴단' },
  // TODO: 전체 서버 목록 불러오기
];

export default function RealmFilterDropdown() {
  // TODO: 선택된 서버 상태 관리 및 필터링 로직 연결
  return (
    <div className="w-full max-w-xs">
      <label htmlFor="realm-select" className="sr-only">
        서버 선택
      </label>
      <select
        id="realm-select"
        name="realm-select"
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        // onChange={(e) => setSelectedRealm(e.target.value)} // 예시
      >
        <option value="">모든 서버</option>
        {tempRealms.map((realm) => (
          <option key={realm.id} value={realm.id}>
            {realm.name}
          </option>
        ))}
      </select>
    </div>
  );
} 