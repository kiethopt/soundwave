'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { RecommendationMatrix } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPage() {
  const [matrixData, setMatrixData] = useState<RecommendationMatrix | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatrix = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          setError('Vui lòng đăng nhập lại');
          setLoading(false);
          return;
        }

        const limit = 2;
        const response = await api.admin.getRecommendationMatrix(limit, token);
        setMatrixData(response);
      } catch (err) {
        setError('Không thể tải dữ liệu ma trận');
      } finally {
        setLoading(false);
      }
    };

    fetchMatrix();
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 font-medium">
        Lỗi: {error}
      </div>
    );
  }

  if (!matrixData || !matrixData.success) {
    return <div className="p-6 text-center">Không có dữ liệu ma trận</div>;
  }

  const {
    users,
    tracks,
    matrix,
    normalizedMatrix,
    itemSimilarityMatrix,
    stats,
  } = matrixData.data;

  // Helper function to get color based on value
  const getHeatmapColor = (value: number, max: number) => {
    const intensity = Math.min(1, Math.max(0, value / max));
    return `rgba(59, 130, 246, ${intensity})`;
  };

  // Find max values for heat maps
  const maxInteraction = matrix
    .flat()
    .reduce((max, val) => Math.max(max, val), 0);
  const maxSimilarity = itemSimilarityMatrix
    .flat()
    .reduce((max, val) => Math.max(max, val), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-8">Phân tích hệ thống đề xuất</h1>

      {/* Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Người dùng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.userCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bài hát
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.trackCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tương tác
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalInteractions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Độ thưa thớt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(stats.sparsity * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tỉ lệ ô trống trong ma trận
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ma trận tương tác */}
      <Card>
        <CardHeader>
          <CardTitle>Ma trận tương tác người dùng-bài hát</CardTitle>
          <p className="text-sm text-muted-foreground">
            Hiển thị số lượt nghe của mỗi người dùng đối với từng bài hát
          </p>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left">Người dùng / Bài hát</th>
                {tracks.map((track) => (
                  <th
                    key={track.id}
                    className="border p-2 text-left whitespace-nowrap"
                  >
                    {track.title}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({track.artist.artistName})
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, userIndex) => (
                <tr key={user.id}>
                  <td className="border p-2 font-medium whitespace-nowrap">
                    {user.username}
                  </td>
                  {matrix[userIndex].map((value, trackIndex) => (
                    <td
                      key={trackIndex}
                      className="border p-2 text-center"
                      style={{
                        backgroundColor: getHeatmapColor(value, maxInteraction),
                      }}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Ma trận chuẩn hóa */}
      <Card>
        <CardHeader>
          <CardTitle>Ma trận chuẩn hóa</CardTitle>
          <p className="text-sm text-muted-foreground">
            Giá trị tương tác được chuẩn hóa để tính toán độ tương đồng
          </p>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left">Người dùng / Bài hát</th>
                {tracks.map((track) => (
                  <th
                    key={track.id}
                    className="border p-2 text-left whitespace-nowrap"
                  >
                    {track.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, userIndex) => (
                <tr key={user.id}>
                  <td className="border p-2 font-medium whitespace-nowrap">
                    {user.username}
                  </td>
                  {normalizedMatrix[userIndex].map((value, trackIndex) => (
                    <td
                      key={trackIndex}
                      className="border p-2 text-center"
                      style={{ backgroundColor: getHeatmapColor(value, 1) }}
                    >
                      {value.toFixed(4)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Ma trận tương đồng */}
      <Card>
        <CardHeader>
          <CardTitle>Ma trận tương đồng giữa các bài hát</CardTitle>
          <p className="text-sm text-muted-foreground">
            Độ tương đồng dựa trên tương tác của người dùng, giá trị càng cao
            đồng nghĩa với tương đồng càng lớn
          </p>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left">Bài hát</th>
                {tracks.map((track) => (
                  <th
                    key={track.id}
                    className="border p-2 text-left whitespace-nowrap"
                  >
                    {track.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, trackIndex) => (
                <tr key={track.id}>
                  <td className="border p-2 font-medium whitespace-nowrap">
                    {track.title}
                  </td>
                  {itemSimilarityMatrix[trackIndex].map((value, index) => (
                    <td
                      key={index}
                      className="border p-2 text-center"
                      style={{
                        backgroundColor: getHeatmapColor(value, maxSimilarity),
                      }}
                    >
                      {value.toFixed(4)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
